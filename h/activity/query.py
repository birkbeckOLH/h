# -*- coding: utf-8 -*-

from __future__ import unicode_literals

from collections import namedtuple

from memex.search import Search
from memex.search import parser
from memex.search.query import (
    TagsAggregation,
    TopLevelAnnotationsFilter,
    UsersAggregation,
)
from pyramid.httpexceptions import HTTPFound
from sqlalchemy.orm import subqueryload

from h import presenters
from h.activity import bucketing
from h.models import Annotation, Document, Group


class ActivityResults(namedtuple('ActivityResults', [
    'total',
    'aggregations',
    'timeframes',
])):
    pass


def extract(request, parse=parser.parse):
    """
    Extract and process the query present in the passed request.

    Assumes that the 'q' query parameter contains a string query in a format
    which can be parsed by :py:func:`memex.search.parser.parse`. Extracts and
    parses the query, adds terms implied by the current matched route, if
    necessary, and returns it.

    If no query is present in the passed request, returns ``None``.
    """
    if 'q' not in request.params:
        return None

    q = parse(request.params['q'])

    # If the query sent to a {group, user} search page includes a {group,
    # user}, we override it, because otherwise we'll display the union of the
    # results for those two {groups, users}, which would makes no sense.
    #
    # (Note that a query for the *intersection* of >1 users or groups is by
    # definition empty)
    if request.matched_route.name == 'activity.group_search':
        q['group'] = request.matchdict['pubid']
    elif request.matched_route.name == 'activity.user_search':
        q['user'] = request.matchdict['username']

    return q


def check_url(request, query, unparse=parser.unparse):
    """
    Checks the request and raises a redirect if implied by the query.

    If a query contains a single group or user term, then the user is
    redirected to the specific group or user search page with that term
    removed. For example, a request to

        /search?q=group:abc123+tag:foo

    will be redirected to

        /groups/abc123/search?q=tag:foo

    Queries containing more than one group or user term are unaffected.
    """
    if request.matched_route.name != 'activity.search':
        return

    redirect = None

    if _single_entry(query, 'group'):
        pubid = query.pop('group')
        redirect = request.route_path('activity.group_search',
                                      pubid=pubid,
                                      _query={'q': unparse(query)})

    if _single_entry(query, 'user'):
        username = query.pop('user')
        redirect = request.route_path('activity.user_search',
                                      username=username,
                                      _query={'q': unparse(query)})

    if redirect is not None:
        raise HTTPFound(location=redirect)


def execute(request, query):
    search = Search(request)
    search.append_filter(TopLevelAnnotationsFilter())
    for agg in aggregations_for(query):
        search.append_aggregation(agg)

    search_result = search.run(query)
    result = ActivityResults(total=search_result.total,
                             aggregations=search_result.aggregations,
                             timeframes=[])

    if result.total == 0:
        return result

    # Load all referenced annotations from the database, bucket them, and add
    # the buckets to result.timeframes.
    anns = _fetch_annotations(request.db, search_result.annotation_ids)
    result.timeframes.extend(bucketing.bucket(anns))

    # Fetch all groups
    group_pubids = set([a.groupid
                        for t in result.timeframes
                        for b in t.document_buckets.values()
                        for a in b.annotations])
    groups = {g.pubid: g for g in _fetch_groups(request.db, group_pubids)}

    # Add group information to buckets and present annotations
    for timeframe in result.timeframes:
        for bucket in timeframe.document_buckets.values():
            for index, annotation in enumerate(bucket.annotations):
                bucket.annotations[index] = {
                    'annotation': presenters.AnnotationHTMLPresenter(annotation),
                    'group': groups.get(annotation.groupid)
                }

    return result


def aggregations_for(query):
    aggregations = [TagsAggregation(limit=10)]

    # Should we aggregate by user?
    if _single_entry(query, 'group'):
        aggregations.append(UsersAggregation(limit=10))

    return aggregations


def _fetch_annotations(session, ids):
    return (session.query(Annotation)
            .options(subqueryload(Annotation.document)
                     .subqueryload(Document.meta_titles))
            .filter(Annotation.id.in_(ids))
            .order_by(Annotation.updated.desc()))


def _fetch_groups(session, pubids):
    return session.query(Group).filter(Group.pubid.in_(pubids))


def _single_entry(query, key):
    return len(query.getall(key)) == 1
