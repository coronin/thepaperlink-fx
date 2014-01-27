// format_page.js - thepaperlink-fx
// author: Liang Cai, 2012

var d = document;

function $(a) { return d.getElementById(a); }

self.port.on('init', function(msg) {
  var apikey = msg[0],
    pubmeder_ok = msg[1],
    cloud_op = msg[2],
    tab_open_if_no_apikey = msg[3],
    no_context_menu = msg[4],
    rev_proxy = msg[5],
    ezproxy_prefix = msg[6],
    div_html;
  div_html = '<p><img src="' + msg[7] +
      '" width="128" height="128" alt="add-on icon" /><br /><em>the Paper Link for PubMed</em><br />' +
      'Start searching in <a href="http://www.ncbi.nlm.nih.gov/pubmed/" target="_blank">http://www.ncbi.nlm.nih.gov/pubmed/' +
      '</a> and enjoy the convenience <a href="http://www.thepaperlink.com" target="_blank">the Paper Link</a> brought to you...</p><ul><li>';

  if (apikey) {
    div_html += 'After search, you can click the icon "&hellip;" shown on the bar for extra function.' +
      'You can update your apikey at ';
  } else {
    div_html += '<i>Want to get more reliable response?</i><br />' +
    '<i>Want to save the articles you read to the cloud?</i><br />' +
    'Activate your account! Visit ';
  }
  div_html += '<a href="http://www.thepaperlink.com/reg" target="_blank">http://www.thepaperlink.com/reg</a></li><li>';

  if (pubmeder_ok) {
    div_html += 'You are ready to save what-you-read to PubMed-er. You can update the status at ';
  } else {
    div_html += '<i>Want to save what-you-read to PubMed-er?</i><br />Connect it at ';
  }
  div_html += '<a href="http://www.pubmeder.com/registration" target="_blank">http://www.pubmeder.com/registration</a></li>';

  if (apikey) {
    div_html += '<li>save&nbsp;it: ';
    if (cloud_op.indexOf('m') > -1) {
      div_html += 'check your existing connection with ';
    } else {
      div_html += 'set up the connection with ';
    }
    div_html += '<a href="http://www.thepaperlink.com/oauth?v=mendeley" target="_blank">Mendeley</a></li><li>save&nbsp;it: ';
    if (cloud_op.indexOf('f') > -1) {
      div_html += 'check your existing connection with ';
    } else {
      div_html += 'set up the connection with ';
    }
    div_html += '<a href="http://www.thepaperlink.com/oauth?v=facebook" target="_blank">Facebook</a></li><li>save&nbsp;it: ';
    if (cloud_op.indexOf('d') > -1) {
      div_html += 'check your existing connection with ';
    } else {
      div_html += 'set up the connection with ';
    }
    div_html += '<a href="http://www.thepaperlink.com/oauth?v=dropbox" target="_blank">Dropbox</a></li><li>save&nbsp;it: ';
    if (cloud_op.indexOf('b') > -1) {
      div_html += 'check your existing connection with ';
    } else {
      div_html += 'set up the connection with ';
    }
    div_html += '<a href="http://www.thepaperlink.com/oauth?v=douban" target="_blank">Douban</a></li>';
  }

  if (!tab_open_if_no_apikey) {
    div_html += '<li>[Pref.] You will not know if your apikey is not correct, really?<br /><button id="check_api">change it</button></li>';
  }
  if (no_context_menu) {
    div_html += '<li>[Pref.] You have disabled context menu, are you sure?<br /><button id="activate_context_menu">change it</button></li>';
  }
  if (rev_proxy) {
    div_html += '<li>you are using the slow server</li>';
  }
  if (ezproxy_prefix && ezproxy_prefix !== 'http://a.b.c/d?url=') {
    div_html += '<li>your library supports ezproxy? your setting is to use ' +
      ezproxy_prefix + '</li>';
  }

  jQuery('#client_title').html('Instruction for Firefox Add-on');
  jQuery('#client_content').html(div_html +
    '<li>More at Firefox Add-on <i>(Ctrl+Shift+A)</i> preference section</li></ul>');

  if ($('check_api')) {
    $('check_api').onclick = function () { self.port.emit('check_apikey'); };
  }
  if ($('activate_context_menu')) {
    $('activate_context_menu').onclick = function () { self.port.emit('activate_context_menu'); };
  }

});