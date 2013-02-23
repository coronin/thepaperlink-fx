// main.js - thepaperlink-fx
// author: Liang Cai, 2012-13

var contextMenu = require('context-menu');
var menus = [];
var addon = require('self').data;
var tabs = require('tabs');
var pageMod = require('page-mod');
var sStore = require('simple-storage').storage;
var req = require('request').Request;
var prefSet = require('simple-prefs');
var clipboard = require('clipboard');
var XMLHttpRequest = require('xhr').XMLHttpRequest;
var pageWorker = require('page-worker');
var timers = require('timers');
//var panel = require('panel');
var ENTREZAJAX_APIKEY = '68ed3a6f270926237eaeeb2f7b2a7f27',
  DEBUG = false,
  rev_proxy_check_timer;


function reload_about_us() {
  for each (var tab in tabs) {
    if (tab.url === 'http://www.thepaperlink.com/static/about_us.html')
      tab.reload();
  }
}

function open_tab_with_url(url) {
  tabs.open('http://www.thepaperlink.com' + url);
}

function detachWorker(worker, workerArray) {
  var i = workerArray.indexOf(worker);
  if(i !== -1) {
    workerArray.splice(i, 1);
    DEBUG && console.log('worker detached');
  } else {
    DEBUG && console.log('worker remains');
  }
}

function update_cloud_op() {
  var oauth_status = prefSet.prefs.oauth_status || '';
  cloud_op = '';
  if (oauth_status.indexOf('mendeley') > -1) {
    cloud_op += 'm';
  }
  if (oauth_status.indexOf('facebook') > -1) {
    cloud_op += 'f';
  }
  if (oauth_status.indexOf('dropbox') > -1) {
    cloud_op += 'd';
  }
  if (oauth_status.indexOf('douban') > -1) {
    cloud_op += 'b';
  }
  DEBUG && console.log('cloud_op: ' + cloud_op);
}

function force_rev_proxy() {
  base_uri = 'http://0.pl4.me';
  rev_proxy = true;
  DEBUG && console.log('rev_proxy_check timeout, force rev_proxy');
}

function rev_proxy_check() {
  rev_proxy_check_timer = timers.setTimeout(force_rev_proxy, 4000);
  req({
    url: 'https://pubget-hrd.appspot.com/static/humans.txt?force_reload=' + Math.random(),
    onComplete: function (response) {
      timers.clearTimeout(rev_proxy_check_timer);
      if (response.status !== 200) {
        base_uri = 'http://0.pl4.me';
        rev_proxy = true;
        DEBUG && console.log(response.status + ', you are accessing the reverse proxied server, which is slower.');
      } else {
        DEBUG && console.log('Hi, you are accessing our secured server. Speedy!');
      }
    }
  }).get();
}

function save_visited_ID(new_id) {
  if (sStore.id_found === undefined) {
    sStore.id_found = new_id;
  } else if (sStore.id_found.indexOf(new_id) === -1) {
    sStore.id_found += ' ' + new_id;
  }
  DEBUG && console.log(sStore.id_found);
  if (sStore.id_found.split(' ').length > 12) {
    saveIt_pubmeder( sStore.id_found.replace(/\s+/g, ',') );
  }
}

function saveIt_pubmeder(pmid) {
  if (pubmeder_apikey === null || pubmeder_apikey === null) {
    DEBUG && console.log('no valid pubmeder credit, open related URL');
    if (prefSet.prefs.tab_open_if_no_apikey) {
      tabs.open('http://www.pubmeder.com/registration');
    }
    return;
  }
  var url = 'https://pubmeder-hrd.appspot.com';
  if (rev_proxy) {
    url = 'http://1.pl4.me';
  }
  url += '/input?apikey=' + pubmeder_apikey + '&email=' + pubmeder_email + '&pmid=' + pmid;
  DEBUG && console.log('req : ' + url);
  req({
    url: url,
    onComplete: function (response) {
      var d = response.json;
      if (d && d.respond > 1) {
        DEBUG && console.log('all sent to www.pubmeder.com');
        if (sStore.id_history === undefined) {
          sStore.id_history = pmid;
        } else {
          sStore.id_history += ',' + pmid;
          DEBUG && console.log(sStore.id_history);
        }
        sStore.id_found = '';
      }
    }
  }).get();
}

function update_ezproxy_prefix(p) {
  if (p && p !== 'http://a.b.c/d?url='
    && (p.substr(0,7) === 'http://' || p.substr(0,8) === 'https://')) {
    ezproxy_prefix = p;
  } else {
    ezproxy_prefix = '';
    prefSet.prefs.ezproxy_prefix = 'http://a.b.c/d?url=';
    if (p !== 'http://a.b.c/d?url=') {
      DEBUG && console.log('Not a valid ezproxy_prefix value, use ""');
    }
  }
}

function eSearch(search_term) {
  var url = 'https://entrezajax2.appspot.com';
  if (rev_proxy) {
    url = 'http://4.pl4.me';
  }
  url += '/esearch?apikey=' + ENTREZAJAX_APIKEY + '&db=pubmed&term=' + search_term;
  DEBUG && console.log('req : ' + url);
  req({
    url: url,
    onComplete: function (response) {
      if (response.json && response.json.result.IdList.length === 1) {
        save_visited_ID( response.json.result.IdList[0] );
      } else {
        DEBUG && console.log('eSearch:\n' + response.status);
      }
    }
  }).get();
}

function upload_pdf_as_binary(upload_url, pdf, pmid, apikey, no_email) {
  var pdf_data = getBinary(pdf), msg, base_uri;
  msg = sendBinary(upload_url, pdf_data, pmid);
  if (msg === null) {
    if (!no_email) {
      DEBUG && console.log('req : ' + base_uri);
      req({
        url: base_uri + '/',
        content : {'pmid': pmid, 'apikey': apikey, 'action': 'email'},
        onComplete: function (response) {
          DEBUG && console.log('pdf upload failed, but email sent');
        }
      }).post();
  } }
}

function queue_scholar_title() {
  DEBUG && console.log('not support in Firefox yet');
  //timers.setTimeout(do_scholar_title, 1250*scholar_run + 1);
}

function do_scholar_title() {
  var pmid = scholar_queue[2*scholar_run],
    t = scholar_queue[2*scholar_run + 1];
  scholar_run += 1;
  scholar_title(pmid, t);
  if (scholar_run === scholar_count) {
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];
    DEBUG && console.log('self-reset scholar_count _run _queue');
  }
}

function scholar_title(pmid, t) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('title', t);
  var in_mem = sStore['scholar_' + pmid], i, url;
  if (in_mem) {
    in_mem = in_mem.split(',', 3);
    for (i = 0; i < pubmed_workers.length; i += 1) {
      pubmed_workers[i].postMessage(['g_scholar', in_mem[0], in_mem[1], in_mem[2]]);
    }
    return;
  }
  url = 'http://scholar.google.com/scholar?as_q=&as_occt=title&as_sdt=1.&as_epq='
    + encodeURIComponent('"' + t + '"');
  for (i = 0; i < pubmed_workers.length; i += 1) {
    pubmed_workers[i].postMessage(['g_scholar', pmid, 1, 1]);
  }
  // chrome code not work here
}

function parse_url(pmid, url) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('url', url);
  var in_mem = sStore['url_' + pmid];
  if (in_mem) {
    in_mem = in_mem.split(',', 2);
    for (i = 0; i < pubmed_workers.length; i += 1) {
      pubmed_workers[i].postMessage(['el_data', '_pdf' + pmid, in_mem[1]]);
    }
    return;
  }
  for (i = 0; i < pubmed_workers.length; i += 1) {
    pubmed_workers[i].postMessage(['el_data', '_pdf' + pmid, 1]);
  }
  // chrome code not work here
}

function loadHTML(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.overrideMimeType('text/html');
  xhr.send(null);
  return xhr.responseText;
}





// below, not fully tested

function getBinary(file) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', file, false);
  if (xhr.hasOwnProperty('responseType')) {
    xhr.responseType = 'arraybuffer';
  } else {
    xhr.overrideMimeType('text/plain; charset=x-user-defined');
  }
  xhr.send(null);
  var responseArrayBuffer = xhr.hasOwnProperty('responseType') && xhr.responseType === 'arraybuffer',
    mozResponseArrayBuffer = 'mozResponseArrayBuffer' in xhr,
    bin_data = mozResponseArrayBuffer ? xhr.mozResponseArrayBuffer : responseArrayBuffer ? xhr.response : xhr.responseText;
  return bin_data;
}

function sendBinary(url, data, pmid) {
  try {
    var xhr = new XMLHttpRequest(),
      boundary = 'AJAX------------------------AJAX',
      contentType = "multipart/form-data; boundary=" + boundary,
      postHead = '--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="file"; filename="pmid_' + pmid + '.pdf"\r\n' +
        'Content-Type: application/octet-stream\r\n\r\n',
      postTail = '\r\n--' + boundary + '--',
      tmp = '',
      abView,
      i;
    if (data instanceof ArrayBuffer) {
      console.log('ArrayBuffer, need View, assume Uint8Array');
      abView = new Uint8Array(data);
      if (abView.length < 1000) {
        return null;
      }
      console.log(abView.length);
      for (i = 0; i < abView.length; i += 1) {
        tmp += String.fromCharCode(abView[i] & 0xff);
      }
      data = postHead + tmp + postTail;
    } else {
      data = postHead + tmp + postTail;
    }
    if (typeof XMLHttpRequest.prototype.sendAsBinary === 'function') {
      console.log('built-in support sendAsBinary');
    } else {
      console.log('define sendAsBinary');
      XMLHttpRequest.prototype.sendAsBinary = function (datastr) {
        function byteValue(x) {
          return x.charCodeAt(0) & 0xff;
        }
        var ords = Array.prototype.map.call(datastr, byteValue);
        var ui8a = new Uint8Array(ords);
        this.send(ui8a.buffer);
      };
    }
    xhr.open('POST', url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.sendAsBinary(data);
    return xhr.responseText;
  } catch (err) {
    return null;
  }
}

// -- Liang Cai -- //

var base_uri = 'https://pubget-hrd.appspot.com',
  apikey = sStore.thepaperlink_apikey || null,
  pubmeder_apikey = sStore.pubmeder_apikey || null,
  pubmeder_email = sStore.pubmeder_email || null,
  pubmeder_ok = false,
  cloud_op = '',
  ezproxy_prefix = prefSet.prefs.ezproxy_prefix || '',
  no_context_menu = prefSet.prefs.no_context_menu || false,
  rev_proxy = prefSet.prefs.rev_proxy || false,
  scholar_count = 0,
  scholar_run = 0,
  scholar_queue = [],
  workers = [],
  pubmed_workers = [];

// check which server to use
rev_proxy || rev_proxy_check();
// generate string for enabled external services
update_cloud_op();
// check pubmeder status
if (pubmeder_apikey && pubmeder_email) { pubmeder_ok = true; }
// fix ezproxy
update_ezproxy_prefix(ezproxy_prefix);
// alerting pages
var currentTime = new Date(),
  year = currentTime.getFullYear(),
  month = currentTime.getMonth() + 1,
  day = currentTime.getDate(),
  date_str = 'day_' + year + '_' + month + '_' + day,
  last_date = sStore.last_date_str || null;
if (last_date !== date_str) {
  sStore.last_date_str = date_str;
  if ( prefSet.prefs.tab_open_if_no_apikey ) {
    if (!apikey) {
      tabs.open('http://www.thepaperlink.com/reg');
    }
    if (!pubmeder_ok) {
      tabs.open('http://www.pubmeder.com/registration');
    }
  } else {
    if (!apikey) { // || !pubmeder_ok
      tabs.open('http://www.thepaperlink.com/static/about_us.html');
    }
  }
}


exports.main = function(options, callbacks) {
  DEBUG && console.log(options.loadReason);

  var menu_a = no_context_menu || contextMenu.Item({
    label: 'search the_Paper_Link',
    image: addon.url('p_16x16.png'),
    context: contextMenu.SelectionContext(),
    contentScript: 'self.on("context", function () {' +
                   '  var text = window.getSelection().toString();' +
                   '  if (text.length > 14)' +
                   '    text = text.substr(0, 14) + "...";' +
                   '  return "search \'" + text + "\' on the_Paper_Link";' +
                   '});' +
                   'self.on("click", function () {' +
                   '  var text = window.getSelection().toString();' +
                   '  self.postMessage(text);' +
                   '});',
    onMessage: function (item) {
      DEBUG && console.log('seaching with "' + item + '"');
      open_tab_with_url('/?q=' + item);
    }
  });
  if (no_context_menu !== true) { menus.push(menu_a); }

  var menu_b = no_context_menu || contextMenu.Item({
    label: 'visit the_Paper_Link',
    image: addon.url('p_16x16.png'),
    context: contextMenu.PageContext(),
    contentScript: 'self.on("click", function () {' +
                   '  self.postMessage("/");' +
                   '});',
    onMessage: function (item) {
      DEBUG && console.log('visiting our server ' + item);
      open_tab_with_url(item);
    }
  });
  if (no_context_menu !== true) { menus.push(menu_b); }

  // @@@@ not allow by Mozilla
  var menu_c = no_context_menu || contextMenu.Item({
    label: 'find the ID on Page',
    context: contextMenu.PageContext(),
    contentScript: 'self.on("click", function () {' +
                   '  if (window.location.protocol === "https:") {' +
                   '    return; }' +
                   '  localStorage.setItem("thePaperLink_pubget_js_key", "' + apikey + '");' +
                   '  localStorage.setItem("thePaperLink_pubget_js_base", "' + base_uri + '/");' +
                   '  if(document.getElementById("__tr_display")){return;}var d=document,s=d.createElement("script");s.setAttribute("type","text/javascript");s.setAttribute("src","' +
                   base_uri + '/js?y="+(Math.random()));d.body.appendChild(s);' +
                   '});'
  });
  if (no_context_menu !== true) { menus.push(menu_c); }
  // @@@@

  var inject_a = pageMod.PageMod({
    include: [
      'http://www.ncbi.nlm.nih.gov/pubmed*',
      'https://www.ncbi.nlm.nih.gov/pubmed*',
      'http://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&*',
      'https://www.ncbi.nlm.nih.gov/sites/entrez?db=pubmed&*',
      'http://www.ncbi.nlm.nih.gov/sites/entrez',
      'https://www.ncbi.nlm.nih.gov/sites/entrez',
      'http://www.ncbi.nlm.nih.gov/sites/entrez/*',
      'https://www.ncbi.nlm.nih.gov/sites/entrez/*'
      ],
    contentScriptWhen: 'ready',
    contentScriptFile: [ addon.url('jquery172min.js'),
                         addon.url('info_bar.js') ],
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script for pubmed pages');
      worker.postMessage(['init', base_uri, apikey,
        pubmeder_ok, pubmeder_apikey, pubmeder_email,
        cloud_op, ezproxy_prefix,
        addon.url('loadingLine.gif'),
        addon.url('clippyIt.png'),
        prefSet.prefs.remote_jss ]);
      //workers.push(worker);
      worker.on('message', function(msg) {
        DEBUG && console.log(msg);
        if (msg[0] === 'url') {
          var req_key = apikey || 'G0oasfw0382Wd3oQ0l1LiWzE'; // temp apikey, may disabled in the future
          if (msg[1]) {
            DEBUG && console.log('req : ' + base_uri);
            req({
              url: base_uri + msg[1] + req_key,
              onComplete: function (response) {
                var d = response.json;
                if (d && (d.count || d.error)) { // good or bad, both got json return
                  worker.postMessage(['tj', d]);
                } else {
                  worker.postMessage(['except', 1]);
                }
              }
            }).get();
          } else {
            worker.postMessage(['wrong', 'No valid URL']);
          }

        } else if (msg[0] === 't_cont') {
          DEBUG && console.log(msg[1]);
          clipboard.set( msg[1].replace(/##/g, '\r\n') );

        } else if (msg[0] === 'upload_pdf') {
          upload_pdf_as_binary(msg[1], msg[2], msg[3], msg[4], msg[5]);

        } else if (msg[0] === 'reset_scholar_count') {
          scholar_count = 0;
          scholar_run = 0;
          scholar_queue = [];
          pubmed_workers = [];
          DEBUG && console.log('on-request reset scholar_count _run _queue');

        } else if (msg[0] === 'pii_link') {
          parse_url(msg[1], 'http://linkinghub.elsevier.com/retrieve/pii/' + msg[2]);
          pubmed_workers.push(worker);

        } else if (msg[0] === 'pmid_title') {
          scholar_queue[2*scholar_count] = msg[1];
          scholar_queue[2*scholar_count + 1] = msg[2];
          scholar_count += 1;
          queue_scholar_title();
          pubmed_workers.push(worker);

        }
      });
      worker.on('detach', function () {
        //detachWorker(this, workers);
        detachWorker(this, pubmed_workers);
      });
    }
  });

  var inject_b = pageMod.PageMod({
    include: [
      'http://pubget-hrd.appspot.com/reg',
      'https://pubget-hrd.appspot.com/reg',
      'http://www.thepaperlink.com/reg',
      'http://www.zhaowenxian.com/reg',
      'http://www.thepaperlink.net/reg',
      'http://0.pl4.me/reg'
      ],
    contentScriptWhen: 'ready',
    contentScript: 'var d = document;' +
                   'var a = d.getElementById("apikey");' +
                   'var c = d.getElementById("cloud_op");' +
                   'var nod = d.getElementById("_thepaperlink_client_modify_it");' +
                   'if (nod) {' +
                   '  nod.textContent = "your Firefox is all good";' +
                   '}' +
                   'if (a && c) {' +
                   '  self.postMessage([a.textContent, c.textContent]);' +
                   '}',
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script for thepaperlink');
      //workers.push(worker);
      worker.on('message', function(msg) {
        DEBUG && console.log(msg);
        apikey = msg[0];
        sStore.thepaperlink_apikey = msg[0];
        prefSet.prefs.oauth_status = msg[1];
        update_cloud_op();
        reload_about_us();
      });
      //worker.on('detach', function () {
      //  detachWorker(this, workers);
      //});
    }
  });

  var inject_c = pageMod.PageMod({
    include: [
      'http://pubmeder-hrd.appspot.com/registration',
      'https://pubmeder-hrd.appspot.com/registration',
      'http://www.pubmeder.com/registration',
      'http://1.pl4.me/registration'
      ],
    contentScriptWhen: 'ready',
    contentScript: 'var d = document;' +
                   'var e = d.getElementById("currentUser");' +
                   'var a = d.getElementById("apikey_pubmeder");' +
                   'if (e && a) {' +
                   '  self.postMessage([e.textContent, a.textContent]);' +
                   '}',
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script for pubmeder');
      //workers.push(worker);
      worker.on('message', function(msg) {
        DEBUG && console.log(msg);
        pubmeder_email = msg[0];
        sStore.pubmeder_email = msg[0];
        pubmeder_apikey = msg[1];
        sStore.pubmeder_apikey = msg[1];
        pubmeder_ok = true;
        reload_about_us();
      });
      //worker.on('detach', function () {
      //  detachWorker(this, workers);
      //});
    }
  });

  var inject_d = pageMod.PageMod({
    include: 'http://www.thepaperlink.com/oauth/*',
    contentScriptWhen: 'ready',
    contentScript: 'var d = document;' +
                   'var s = d.getElementById("r_success");' +
                   'var c = d.getElementById("r_content");' +
                   'if (s && c) {' +
                   '  self.postMessage([s.textContent, c.textContent]);' +
                   '}',
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script for thepaperlink-oauth');
      //workers.push(worker);
      worker.on('message', function(msg) {
        DEBUG && console.log(msg);
        if (msg[0]) {
          var reload_var = 0;
          if (prefSet.prefs.oauth_status === undefined) {
            prefSet.prefs.oauth_status = msg[0];
            reload_var = 1;
          } else if (prefSet.prefs.oauth_status.indexOf(msg[0]) === -1) {
            prefSet.prefs.oauth_status += ' ' + msg[0];
            reload_var = 1;
          }
          if (reload_var) {
            update_cloud_op();
            reload_about_us();
          }
        }
      });
      //worker.on('detach', function () {
      //  detachWorker(this, workers);
      //});
    }
  });

  var inject_e = pageMod.PageMod({
    include: '*',
    contentScriptWhen: 'ready',
    contentScriptFile: addon.url('find_id.js'),
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script to found an ID');
      //workers.push(worker);
      worker.on('message', function(msg) {
        DEBUG && console.log(msg);
        if (msg[0] === 'foundID') {
          var dotCheck = /\./,
            pmcCheck = /PMC/;
          if (dotCheck.test(msg[1]) || pmcCheck.test(msg[1])) {
            eSearch( msg[1] );
          } else {
            save_visited_ID( msg[1] );
          }
        }
      });
      //worker.on('detach', function () {
      //  detachWorker(this, workers);
      //});
    }
  });

  var inject_f = pageMod.PageMod({
    include: 'http://www.thepaperlink.com/static/about_us.html',
    contentScriptWhen: 'ready',
    contentScriptFile: [ addon.url('jquery172min.js'),
                         addon.url('format_page.js') ],
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script to instruction');
      worker.postMessage([
        apikey,
        pubmeder_ok,
        cloud_op,
        prefSet.prefs.tab_open_if_no_apikey,
        prefSet.prefs.no_context_menu,
        prefSet.prefs.rev_proxy,
        prefSet.prefs.ezproxy_prefix,
        addon.url('p_128x128.png')
      ]);
      //workers.push(worker);
      worker.on('message', function(msg) {
        DEBUG && console.log(msg);
        if (msg === 'check_apikey') {
          prefSet.prefs.tab_open_if_no_apikey = true;
          reload_about_us();
        } else if (msg === 'activate_context_menu') {
          prefSet.prefs.no_context_menu = false;
          reload_about_us();
        }
      });
      //worker.on('detach', function () {
      //  detachWorker(this, workers);
      //});
    }
  });

  var inject_g = pageMod.PageMod({
    include: [
      'http://pubget-hrd.appspot.com*',
      'https://pubget-hrd.appspot.com*',
      'http://www.thepaperlink.com*',
      'http://www.zhaowenxian.com*',
      'http://www.thepaperlink.net*',
      'http://0.pl4.me*'
      ],
    contentScriptWhen: 'ready',
    contentScriptFile: addon.url('el_link.js'),
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script 2 for thepaperlink');
      workers.push(worker);
      worker.on('message', function(msg) {
        DEBUG && console.log(msg);
      });
      worker.on('detach', function () {
        detachWorker(this, workers);
      });
    }
  });
};

prefSet.on('ezproxy_prefix', function () {
  update_ezproxy_prefix(prefSet.prefs.ezproxy_prefix);
});

prefSet.on('no_context_menu', function () {
  if ( prefSet.prefs.no_context_menu ) {
    no_context_menu = true;
    DEBUG && console.log('Will not shown any contextual menu');
    var i;
    for (i = 0; i < menus.length; i += 1) {
      menus[i].destroy();
    }
  } else {
    DEBUG && console.log('Restart to show the contextual menu');
  }
});

prefSet.on('rev_proxy', function () {
  if ( prefSet.prefs.rev_proxy ) {
    rev_proxy = true;
    DEBUG && console.log('Will use the reverse proxied server');
  } else {
    rev_proxy = false;
    DEBUG && console.log('Will use the secured server');
  }
});

var ws = pageWorker.Page({
  contentUrl: addon.url('worker.htm'),
  contentScriptFile: addon.url('worker.js'),
  onMessage: function (msg) {
    try {
      DEBUG && console.log(msg);
      var d = JSON.parse(msg),
        req_key = apikey || 'G0oasfw0382Wd3oQ0l1LiWzE';
      if (d.apikey === req_key && d.action) {
        if (d.action === 'title') {
          scholar_title(d.pmid, d.title);
        } else if (d.action === 'url') {
          parse_url(d.pmid, d.url);
        } else if (d.action === 'pdfLink_quick') {
          for (i = 0; i < workers.length; i += 1) {
            workers[i].postMessage(['el_data', 'pdfLink_quick', d.pdfLink_quick]);
          }
        } else if (d.action === 'dropbox_it') {
          DEBUG; //dropbox_it(d.pmid, d.pdf, d.apikey);
        }
      }
    } catch (err) {
      DEBUG && console.log('json parse error: ' + msg);
      return;
    }
  }
});
var ws_addr = sStore.ws_address || 'node.thepaperlink.com:8081';
req({
  url: 'http://node.thepaperlink.com:8089',
  onComplete: function (d) {
    if (d.status === 200) {
      DEBUG && console.log('req : ' + base_uri);
      req({
        url: base_uri + '/',
        content : {'pmid':'1', 'title':'WEBSOCKET_SERVER', 'ip':d.json['x-forwarded-for']},
        onComplete: function (ws_d) {
          DEBUG && console.log('>> get_ws_address: ' + ws_d.text);
          sStore.ws_address = ws_d.text;
          if (ws_d.text !== ws_addr) {
            DEBUG && console.log('>> connect to the new ws server');
            ws.port.emit('req_key', [apikey || 'G0oasfw0382Wd3oQ0l1LiWzE', ws_d.text]);
          }
        }
      }).post();
    }
  }
}).get();
// req_key as the trigger
ws.port.emit('req_key', [apikey || 'G0oasfw0382Wd3oQ0l1LiWzE', ws_addr]);