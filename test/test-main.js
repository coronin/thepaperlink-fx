const main = require('main');

exports.test_test_run = function(test) {
  test.pass('Unit test running!');
};

exports.test_id = function(test) {
  test.assert(require('self').id.length > 0);
};

exports.test_nonPubMed = function(test) {
  require('request').Request({
    url: 'http://www.thepaperlink.com',
    onComplete: function(response) {
      test.assertEqual(response.statusText, 'OK');
      test.done();
    }
  }).get();
  test.waitUntilDone(20000);
};

exports.test_PubMed1 = function(test) {
  require('request').Request({
    url: 'http://www.ncbi.nlm.nih.gov/pubmed?term=coronin',
    onComplete: function(response) {
      test.assertEqual(response.statusText, 'OK');
      test.done();
    }
  }).get();
  test.waitUntilDone(20000);
};

exports.test_PubMed2 = function(test) {
  require('request').Request({
    url: 'http://www.ncbi.nlm.nih.gov/pubmed/18775315',
    onComplete: function(response) {
      test.assertEqual(response.statusText, 'OK');
      test.done();
    }
  }).get();
  test.waitUntilDone(20000);
};