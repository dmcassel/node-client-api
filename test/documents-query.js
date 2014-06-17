/*
 * Copyright 2014 MarkLogic Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var should = require('should');

var testutil = require('./test-util.js');

var marklogic = require('../');
var q = marklogic.queryBuilder;

var db = marklogic.createDatabaseClient(testutil.restReaderConnection);
var dbWriter = marklogic.createDatabaseClient(testutil.restWriterConnection);

describe('document query', function(){
  before(function(done){
// NOTE: must create a string range index on rangeKey1 and rangeKey2
    dbWriter.documents.write({
      uri: '/test/query/matchDir/doc1.json',
      collections: ['matchCollection1'],
      contentType: 'application/json',
      content: {
        id:       'matchDoc1',
        valueKey: 'match value',
        wordKey:  'matchWord1 unmatchWord2'
        }
      }, {
        uri: '/test/query/unmatchDir/doc2.json',
        collections: ['queryCollection0', 'queryCollection1'],
        contentType: 'application/json',
        content: {
          id:       'unmatchDoc2',
          valueKey: 'unmatch value',
          wordKey:  'unmatchWord3'
          }
      }, {
        uri: '/test/query/matchList/doc1.json',
        collections: ['matchList'],
        contentType: 'application/json',
        content: {
          id:        'matchList1',
          rangeKey1: 'aa',
          rangeKey2: 'ba',
          scoreKey:  'unselectedWord unselectedWord unselectedWord unselectedWord'
          }
      }, {
        uri: '/test/query/matchList/doc2.json',
        collections: ['matchList'],
        contentType: 'application/json',
        content: {
          id:        'matchList2',
          rangeKey1: 'ab',
          rangeKey2: 'ba',
          scoreKey:  'matchList unselectedWord unselectedWord unselectedWord'
          }
      }, {
        uri: '/test/query/matchList/doc3.json',
        collections: ['matchList'],
        contentType: 'application/json',
        content: {
          id:        'matchList3',
          rangeKey1: 'aa',
          rangeKey2: 'bb',
          scoreKey:  'matchList matchList unselectedWord unselectedWord'
          }
      }, {
        uri: '/test/query/matchList/doc4.json',
        collections: ['matchList'],
        contentType: 'application/json',
        content: {
          id:        'matchList4',
          rangeKey1: 'ab',
          rangeKey2: 'bb',
          scoreKey:  'matchList matchList matchList unselectedWord'
          }
      }, {
        uri: '/test/query/matchList/doc5.json',
        collections: ['matchList'],
        contentType: 'application/json',
        content: {
          id:        'matchList5',
          rangeKey1: 'ac',
          rangeKey2: 'bc',
          scoreKey:  'matchList matchList matchList matchList matchList'
          }
        }).
    result(function(response){done();}, done);
  });
  describe('for a built where clause', function() {
    it('should match a directory query', function(done){
      db.query(
        q.where(
          q.directory('/test/query/matchDir/')
          )
        ).
      result(function(response) {
        response.length.should.equal(1);
        var document = response[0];
        document.should.be.ok;
        document.uri.should.equal('/test/query/matchDir/doc1.json');
        document.content.should.be.ok;
        document.content.id.should.equal('matchDoc1');
        done();
      }, done);
    });
    it('should match a collection query', function(done){
      db.query(
        q.where(
          q.collection('matchCollection1')
          )
        ).
      result(function(response) {
        response.length.should.equal(1);
        var document = response[0];
        document.should.be.ok;
        document.uri.should.equal('/test/query/matchDir/doc1.json');
        document.content.should.be.ok;
        document.content.id.should.equal('matchDoc1');
        done();
      }, done);
    });
    it('should match a value query', function(done){
      db.query(
        q.where(
          q.value('valueKey', 'match value')
          )
        ).
      result(function(response) {
        response.length.should.equal(1);
        var document = response[0];
        document.should.be.ok;
        document.uri.should.equal('/test/query/matchDir/doc1.json');
        document.content.should.be.ok;
        document.content.id.should.equal('matchDoc1');
        done();
      }, done);
    });
    it('should match a word query', function(done){
      db.query(
        q.where(
          q.word('wordKey', 'matchWord1')
          )
        ).
      result(function(response) {
        response.length.should.equal(1);
        var document = response[0];
        document.should.be.ok;
        document.uri.should.equal('/test/query/matchDir/doc1.json');
        document.content.should.be.ok;
        document.content.id.should.equal('matchDoc1');
        done();
      }, done);
    });
    it('should calculate key1 and key2 facets without results', function(done){
      db.query(
        q.where(
            q.collection('matchList')
          ).
        calculate(
            q.facet('rangeKey1'),
            q.facet('rangeKey2')).
        slice(0)
        ).
      result(function(response) {
        response.facets.should.be.ok;
        response.facets.rangeKey1.should.be.ok;
        response.facets.rangeKey1.facetValues.should.be.ok;
        response.facets.rangeKey1.facetValues.length.should.equal(3);
        response.facets.rangeKey2.should.be.ok;
        response.facets.rangeKey2.facetValues.should.be.ok;
        response.facets.rangeKey2.facetValues.length.should.equal(3);
        done();
      }, done);
    });
    it('should calculate key1 and key2 facets with ordered results', function(done){
      db.query(
        q.where(
            q.collection('matchList')
          ).
        calculate(
            q.facet('rangeKey1'),
            q.facet('rangeKey2')).
        orderBy('rangeKey1', 'rangeKey2')
        ).
      result(function(response) {
        response.length.should.equal(6);
        var order = [1, 3, 2, 4, 5];
        for (var i=0; i <= order.length; i++) {
          var document = response[i];
          document.should.be.ok;
          if (i === 0) {
            document.facets.should.be.ok;
            document.facets.rangeKey1.should.be.ok;
            document.facets.rangeKey1.facetValues.should.be.ok;
            document.facets.rangeKey1.facetValues.length.should.equal(3);
            document.facets.rangeKey2.should.be.ok;
            document.facets.rangeKey2.facetValues.should.be.ok;
            document.facets.rangeKey2.facetValues.length.should.equal(3);
          } else {
            document.content.should.be.ok;
            document.content.id.should.be.ok;
            document.content.id.should.equal('matchList'+order[i - 1]);
          }
        }
        done();
      }, done);
    });
    it('should order by key1 and key2', function(done){
      db.query(
        q.where(
            q.collection('matchList')
          ).
        orderBy('rangeKey1', 'rangeKey2')
        ).
      result(function(response) {
        response.length.should.equal(5);
        var order = [1, 3, 2, 4, 5];
        for (var i=0; i < order.length; i++) {
          var document = response[i];
          document.should.be.ok;
          document.content.should.be.ok;
          document.content.id.should.be.ok;
          document.content.id.should.equal('matchList'+order[i]);
        }
        done();
      }, done);
    });
    it('should order by key2 and key1 descending', function(done){
      db.query(
        q.where(
            q.collection('matchList')
          ).
        orderBy('rangeKey2', q.sort('rangeKey1', 'descending'))
        ).
      result(function(response) {
        response.length.should.equal(5);
        var order = [2, 1, 4, 3, 5];
        for (var i=0; i < order.length; i++) {
          var document = response[i];
          document.should.be.ok;
          document.content.should.be.ok;
          document.content.id.should.be.ok;
          document.content.id.should.equal('matchList'+order[i]);
        }
        done();
      }, done);
    });
    it('should order by key1 and score', function(done){
      db.query(
        q.where(
            q.or(
                q.collection('matchList'),
                q.word('scoreKey', 'matchList')
                )
          ).
        orderBy('rangeKey1', q.score())
        ).
      result(function(response) {
        response.length.should.equal(5);
        var order = [3, 1, 4, 2, 5];
        for (var i=0; i < order.length; i++) {
          var document = response[i];
          document.should.be.ok;
          document.content.should.be.ok;
          document.content.id.should.be.ok;
          document.content.id.should.equal('matchList'+order[i]);
        }
        done();
      }, done);
    });
    it('should take a slice from the middle', function(done){
      db.query(
        q.where(
            q.word('scoreKey', 'matchList')
          ).
        slice(2, 3)
        ).
      result(function(response) {
        response.length.should.equal(3);
        for (var i=0; i < 3; i++) {
          var document = response[i];
          document.should.be.ok;
          document.content.should.be.ok;
          document.content.id.should.be.ok;
          document.content.id.should.equal('matchList'+(4 - i));
        }
        done();
      }, done);
    });
    it('should take a slice from the end', function(done){
      db.query(
        q.where(
            q.word('scoreKey', 'matchList')
          ).
        slice(3)
        ).
      result(function(response) {
        response.length.should.equal(2);
        for (var i=0; i < 2; i++) {
          var document = response[i];
          document.should.be.ok;
          document.content.should.be.ok;
          document.content.id.should.be.ok;
          document.content.id.should.equal('matchList'+(3 - i));
        }
        done();
      }, done);
    });
    it('should get the plan and permissions', function(done){
      db.query(
        q.where(
            q.collection('matchList')
          ).
        withOptions({queryPlan:true, category:'permissions'})
        ).
      result(function(response) {
        response.length.should.equal(6);
        // TODO: separate the diagnostics from the facets
        for (var i=0; i < 6; i++) {
          switch(i) {
          case 0:
            var summary = response[i];
            summary.should.be.ok;
            summary.plan.should.be.ok;
            break;
          default:
            var document = response[i];
            document.should.be.ok;
            document.permissions.should.be.ok;
            ('content' in document).should.equal(false);
          }
        }
        done();
      }, done);
    });
  });
  describe('for a where clause with a parsed query', function() {
    it('should match a value query', function(done){
      db.query(
        q.where(
          q.parsedFrom('matchConstraint:matchWord1',
            q.parseBindings(
              q.word('wordKey', q.bind('matchConstraint'))
              ))
          )
        ).
      result(function(response) {
        response.length.should.equal(1);
        var document = response[0];
        document.should.be.ok;
        document.uri.should.equal('/test/query/matchDir/doc1.json');
        document.content.should.be.ok;
        document.content.id.should.equal('matchDoc1');
        done();
      }, done);
    });
  });
  describe('for a QBE where clause', function() {
    it('should match a value query', function(done){
      db.query(
        q.where(
            q.byExample({
              valueKey: 'match value'
              })
          )
        ).
      result(function(response) {
        response.length.should.equal(1);
        var document = response[0];
        document.should.be.ok;
        document.uri.should.equal('/test/query/matchDir/doc1.json');
        document.content.should.be.ok;
        document.content.id.should.equal('matchDoc1');
        done();
      }, done);
    });
    it('should match a word query', function(done){
      db.query(
        q.where(
            q.byExample({
              wordKey: {$word:'matchWord1'}
              })
          )
        ).
      result(function(response) {
        response.length.should.equal(1);
        var document = response[0];
        document.should.be.ok;
        document.uri.should.equal('/test/query/matchDir/doc1.json');
        document.content.should.be.ok;
        document.content.id.should.equal('matchDoc1');
        done();
      }, done);
    });
  });
});
