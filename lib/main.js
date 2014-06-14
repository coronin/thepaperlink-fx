// main.js - thepaperlink-fx
// author: Liang Cai, 2012-13

var version = 'Firefox_1.2.6';
var contextMenu = require('sdk/context-menu');
var menus = [];
var addon = require('sdk/self').data;
var tabs = require('sdk/tabs');
var pageMod = require('sdk/page-mod');
var sStore = require('sdk/simple-storage').storage;
var req = require('sdk/request').Request;
var prefSet = require('sdk/simple-prefs');
var clipboard = require('sdk/clipboard');
var XMLHttpRequest = require('sdk/net/xhr').XMLHttpRequest;
var pageWorker = require('sdk/page-worker');
var timers = require('sdk/timers');
//var panel = require('sdk/panel');
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
  if (oauth_status.indexOf('googledrive') > -1) {
    cloud_op += 'g';
  }
  if (oauth_status.indexOf('skydrive') > -1) {
    cloud_op += 's';
  }
  DEBUG && console.log('cloud_op: ' + cloud_op);
}

function force_rev_proxy() {
  base_uri = 'http://www.zhaowenxian.com';
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
        base_uri = 'http://www.zhaowenxian.com';
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
    url = 'http://1.zhaowenxian.com';
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
    url = 'http://4.zhaowenxian.com';
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
  var pdf_data = get_binary(pdf), msg, base_uri;
  msg = send_binary(upload_url, pdf_data, pmid);
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
  timers.setTimeout(
    do_scholar_title,
    1000*scholar_run + Math.floor(Math.random() * 1000)
  );
}

function do_scholar_title() {
  var pmid = scholar_queue[2*scholar_run],
    t = scholar_queue[2*scholar_run + 1];
  scholar_run += 1;
  scholar_title(pmid, t, false);
  if (scholar_run === scholar_count) {
    scholar_count = 0;
    scholar_run = 0;
    scholar_queue = [];
    DEBUG && console.log('self-reset scholar_count _run _queue');
  }
}

// below, not fully tested

function loadHTML(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.overrideMimeType('text/html');
  xhr.send(null);
  return xhr.responseText;
}

function scholar_title(pmid, t, to_workers) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('title', t);
  var in_mem = sStore['scholar_' + pmid], i, url;
  if (in_mem) {
    in_mem = in_mem.split(',', 3);
    if (to_workers) {
      for (i = 0; i < workers.length; i += 1) {
        workers[i].port.emit('message', ['g_scholar', in_mem[0], in_mem[1], in_mem[2]]);
      }
    } else {
      scholar_worker.port.emit('to_bar', ['g_scholar', in_mem[0], in_mem[1], in_mem[2]]);
    }
    return;
  }
  url = 'http://scholar.google.com/scholar?as_q=&as_occt=title&as_sdt=1.&as_epq='
    + encodeURIComponent('"' + t + '"');
  if (!to_workers) {
    scholar_worker.port.emit('to_bar', ['g_scholar', pmid, 1, 1]);
  }
  // 2014-1-27
  var r = loadHTML(url),
    reg = /<a[^<]+>Cited by \d+<\/a>/,
    h = reg.exec(r),
    g_num = [], g_link = [];
  if (h && h.length) {
    DEBUG && console.log(h);
    g_num = />Cited by (\d+)</.exec(h[0]);
    g_link = /href="([^"]+)"/.exec(h[0]);
    if (g_num.length === 2 && g_link.length === 2) {
      sStore['scholar_' + pmid] = pmid + ',' + g_num[1] + ',' + g_link[1];
      if (to_workers) {
        for (i = 0; i < workers.length; i += 1) {
          workers[i].port.emit('message', ['g_scholar', pmid, g_num[1], g_link[1]]);
        }
      } else {
        scholar_worker.port.emit('to_bar', ['g_scholar', pmid, g_num[1], g_link[1]]);
      }
      req({
        url: base_uri + '/',
        content : {'apikey': apikey, 'pmid': pmid, 'g_num': g_num[1], 'g_link': g_link[1]},
        onComplete: function (response) {
          DEBUG && console.log('>> post g_num and g_link status: ' + response.status);
        }
      }).post();
      return;
    }
  }
  if (!to_workers) {
    scholar_worker.port.emit('to_bar', ['g_scholar', pmid, 0, 0]);
  }
  if (/503/.exec(r) && !scholar_valid_page_open) {
    tabs.open('http://scholar.google.com/');
    scholar_valid_page_open = true;
  }
}

function parse_url(pmid, url, a_worker) {
  DEBUG && console.log('pmid', pmid);
  DEBUG && console.log('url', url);
  var in_mem = sStore['url_' + pmid];
  if (in_mem) {
    in_mem = in_mem.split(',', 2);
    if (a_worker) {
      a_worker.port.emit('to_bar', ['el_data', '_pdf' + pmid, in_mem[1]]);
    } else {
      for (i = 0; i < workers.length; i += 1) {
        workers[i].port.emit('message', ['el_data', 'pdfLink_quick', in_mem[1]]);
      }
    }
    return;
  }
  if (a_worker) {
    a_worker.port.emit('to_bar', ['el_data', '_pdf' + pmid, 1]);
  }
  // 2014-1-27
  var r = loadHTML(url),
    reg = /href="([^"]+)" target="newPdfWin"/,
    reg2 = /Cited by in Scopus \((\d+)\)/i,
    h = reg.exec(r),
    h2 = reg2.exec(r),
    args;
  if (h && h.length) {
    DEBUG && console.log(h);
    args = {'apikey': apikey, 'pmid': pmid, 'pii_link': h[1]};
    if (h2 && h2.length) {
      DEBUG && console.log(h2);
      args.scopus_n = h2[1];
      sStore['scopus_' + pmid] = pmid + ',' + h2[1];
      if (a_worker) {
        a_worker.port.emit('to_bar', ['el_data', 'pl4_scopus' + pmid, h2[1]]);
      }
    }
    sStore['url_' + pmid] = pmid + ',' + h[1];
    if (a_worker) {
      a_worker.port.emit('to_bar', ['el_data', '_pdf' + pmid, h[1]]);
    } else {
      for (i = 0; i < workers.length; i += 1) {
        workers[i].port.emit('message', ['el_data', 'pdfLink_quick', h[1]]);
      }
    }
    req({
      url: base_uri + '/',
      content : args,
      onComplete: function (response) {
        DEBUG && console.log('>> post pii_link status: ' + response.status);
      }
    }).post();
    return;
  }
  if (a_worker) {
    a_worker.port.emit('to_bar', ['el_data', '_pdf' + pmid, '://']);
  }
}

function get_binary(file) {
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

function send_binary(url, data, pmid) {
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

function dropbox_it(pmid, pdf, k) {
  req({
    url: base_uri + '/file/new',
    content : {'apikey': k, 'no_email': 1},
    onComplete: function (response) {
      if (response.status === 200) {
        upload_pdf_as_binary(response.text, pdf, pmid, k, 1);
      }
    }
  }).get();
}

// -- Liang Cai -- //

var base_uri = 'https://pubget-hrd.appspot.com',
  apikey = sStore.thepaperlink_apikey || null, guest_apikey,
  no_valid_apikey = false,
  pubmeder_apikey = sStore.pubmeder_apikey || null,
  pubmeder_email = sStore.pubmeder_email || null,
  pubmeder_ok = false,
  cloud_op = '',
  ezproxy_prefix = prefSet.prefs.ezproxy_prefix || '',
  no_context_menu = prefSet.prefs.no_context_menu || false,
  rev_proxy = prefSet.prefs.rev_proxy || false,
  scholar_count = 0,
  scholar_run = 0,
  scholar_queue = [], scholar_worker,
  scholar_valid_page_open = false,
  workers = [];

// check which server to use
rev_proxy || rev_proxy_check();
// generate string for enabled external services
update_cloud_op();
// check pubmeder status
if (pubmeder_apikey && pubmeder_email) { pubmeder_ok = true; }
// fix ezproxy
update_ezproxy_prefix(ezproxy_prefix);
// alerting pages
var extension_load_date = new Date(),
  date_str = 'day_' + extension_load_date.getFullYear() +
    '_' + (extension_load_date.getMonth() + 1) +
    '_' + extension_load_date.getDate(),
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
    DEBUG && console.log('update date, but not alert; ' + date_str);
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
      DEBUG && console.log('visiting our service ' + item);
      open_tab_with_url(item);
    }
  });
  if (no_context_menu !== true) { menus.push(menu_b); }

  // @@@@ not allow by Mozilla
  var menu_c = no_context_menu || contextMenu.Item({
    label: 'find the ID v.1',
    context: contextMenu.PageContext(),
    contentScript: 'self.on("click", function () {' +
                   '  localStorage.setItem("thePaperLink_pubget_js_key", "' + apikey + '");' +
                   '  localStorage.setItem("thePaperLink_pubget_js_base", "https://pubget-hrd.appspot.com/");' +
                   '  if(document.getElementById("__tr_display")){return;}var d=document,s=d.createElement("script");s.setAttribute("type","text/javascript");s.setAttribute("src","' +
                   'https://pubget-hrd.appspot.com/js?y="+(Math.random()));d.body.appendChild(s);' +
                   '});'
  });
  var menu_cc = no_context_menu || contextMenu.Item({
    label: 'find the ID v.2',
    context: contextMenu.PageContext(),
    contentScript: 'self.on("click", function () {' +
                   '  if (window.location.protocol === "https:") {' +
                   '    alert("please try v.1 if available"); return; }' +
                   '  localStorage.setItem("thePaperLink_pubget_js_key", "' + apikey + '");' +
                   '  localStorage.setItem("thePaperLink_pubget_js_base", "http://www.zhaowenxian.com/");' +
                   '  if(document.getElementById("__tr_display")){return;}var d=document,s=d.createElement("script");s.setAttribute("type","text/javascript");s.setAttribute("src","' +
                   'http://www.zhaowenxian.com/js?y="+(Math.random()));d.body.appendChild(s);' +
                   '});'
  });
  if (no_context_menu !== true) {
    if (rev_proxy) {
      menus.push(menu_cc);
    } else {
      menus.push(menu_c);
      menus.push(menu_cc);
    }
  }
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
    contentScriptFile: [ addon.url('jquery-1.8.3.min.js'),
                         addon.url('info_bar.js') ],
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script for pubmed pages');
      worker.port.emit('to_bar', ['init', base_uri, apikey,
        pubmeder_ok, pubmeder_apikey, pubmeder_email,
        cloud_op, ezproxy_prefix,
        addon.url('loadingLine.gif'),
        addon.url('clippyIt.png'),
        prefSet.prefs.remote_jss ]);
      //workers.push(worker);
      worker.port.on('bar_msg', function(msg) {
        if (no_valid_apikey) {
          return;
        }
        DEBUG && console.log(msg);
        if (msg[0] === 'url') {
          var req_key = apikey || guest_apikey;
          if (msg[1]) {
            DEBUG && console.log('req : ' + base_uri);
            var request_url = base_uri + msg[1] + req_key;
            if (uid) {
              request_url += '&uid=' + uid;
            }
            req({
              url: request_url,
              onComplete: function (response) {
                var d = response.json;
                if (d && (d.count || d.error)) { // good or bad, both got json return
                  worker.port.emit('to_bar', ['tj', d]);
                } else {
                  worker.port.emit('to_bar', ['except', 1]);
                }
              }
            }).get();
          } else {
            worker.port.emit('to_bar', ['wrong', 'No valid URL']);
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
          DEBUG && console.log('on-request reset scholar_count _run _queue');

        } else if (msg[0] === 'pii_link') {
          parse_url(msg[1], 'http://linkinghub.elsevier.com/retrieve/pii/' + msg[2], worker);

        } else if (msg[0] === 'pmid_title') {
          scholar_queue[2*scholar_count] = msg[1];
          scholar_queue[2*scholar_count + 1] = msg[2];
          scholar_count += 1;
          scholar_worker = worker;
          queue_scholar_title();

        }
      });
      //worker.on('detach', function () {
      //  detachWorker(this, workers);
      //});
    }
  });

  var inject_b = pageMod.PageMod({
    include: [
      'http://pubget-hrd.appspot.com/reg',
      'https://pubget-hrd.appspot.com/reg',
      'http://www.thepaperlink.com/reg',
      'http://www.zhaowenxian.com/reg',
      'http://www.thepaperlink.net/reg',
      'http://0.cail.cn/reg'
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
                   '  self.port.emit("0.pl", [a.textContent, c.textContent]);' +
                   '}',
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script for thepaperlink');
      //workers.push(worker);
      worker.port.on('0.pl', function(msg) {
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
      'http://1.zhaowenxian.com/registration',
      'http://1.cail.cn/registration'
      ],
    contentScriptWhen: 'ready',
    contentScript: 'var d = document;' +
                   'var e = d.getElementById("currentUser");' +
                   'var a = d.getElementById("apikey_pubmeder");' +
                   'if (e && a) {' +
                   '  self.port.emit("1.pl", [e.textContent, a.textContent]);' +
                   '}',
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script for pubmeder');
      //workers.push(worker);
      worker.port.on('1.pl', function(msg) {
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
                   '  self.port.emit("pl_oauth", [s.textContent, c.textContent]);' +
                   '}',
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script for thepaperlink-oauth');
      //workers.push(worker);
      worker.port.on('pl_oauth', function(msg) {
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
      worker.port.on('foundID', function(msg) {
        DEBUG && console.log(msg);
        var dotCheck = /\./,
          pmcCheck = /PMC/;
        if (dotCheck.test(msg) || pmcCheck.test(msg)) {
          eSearch( msg );
        } else {
          save_visited_ID( msg );
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
    contentScriptFile: [ addon.url('jquery-1.8.3.min.js'),
                         addon.url('format_page.js') ],
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script to instruction');
      worker.port.emit('init', [
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
      worker.port.on('check_apikey', function() {
        prefSet.prefs.tab_open_if_no_apikey = true;
        reload_about_us();
      });
      worker.port.on('activate_context_menu', function() {
        prefSet.prefs.no_context_menu = false;
        reload_about_us();
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
      'http://0.cail.cn*'
      ],
    contentScriptWhen: 'ready',
    contentScriptFile: addon.url('el_link.js'),
    onAttach: function onAttach(worker) {
      DEBUG && console.log('attaching content script 2 for thepaperlink');
      workers.push(worker);
      //worker.port.on('message', function(msg) {
      //  DEBUG && console.log(msg);
      //});
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
        req_key = apikey || guest_apikey;
      if (d.apikey === req_key && d.action) {
        if (d.action === 'title') {
          scholar_title(d.pmid, d.title, true);
        } else if (d.action === 'url') {
          parse_url(d.pmid, d.url, null);
        } else if (d.action === 'pdfLink_quick') {
          for (i = 0; i < workers.length; i += 1) {
            workers[i].port.emit('message', ['el_data', 'pdfLink_quick', d.pdfLink_quick]);
          }
        } else if (d.action === 'dropbox_it') {
          dropbox_it(d.pmid, d.pdf, d.apikey);
        }
      }
    } catch (err) {
      DEBUG && console.log('json parse error: ' + msg);
      return;
    }
  }
});
var ws_addr = sStore.ws_address || 'node.thepaperlink.com:8081',
  uid = sStore.ip_time_uid || null,
  local_ip;
req({
  url: 'http://node.thepaperlink.com:8089',
  onComplete: function (d) {
    if (d.status === 200) {
      local_ip = d.json['x-forwarded-for'];
      if (local_ip && !uid) {
        uid = local_ip + ':';
        uid += extension_load_date.getTime();
        sStore.ip_time_uid = uid;
      }
      DEBUG && console.log('req : ' + base_uri);
      req({
        url: base_uri + '/',
        content : {'pmid':'1', 'title':'GUEST_APIKEY', 'ip':local_ip, 'a':version},
        onComplete: function (dd) {
          if (dd.status === 200) {
            guest_apikey = dd.json['guest_apikey'];
            sStore.thepaperlink_guest_apikey = guest_apikey;
            sStore.ws_address = dd.json['websocket_server'];
            if (dd.websocket_server !== ws_addr) {
              DEBUG && console.log('>> connect to the new ws server');
              ws.port.emit('req_key', [apikey || guest_apikey, dd.json['websocket_server']]);
            }
            if (dd.json['fx'] && version != dd.json['fx']) {
              tabs.open('http://www.thepaperlink.com/static/about_us.html');
            }
          } else if (!apikey) {
            no_valid_apikey = true;
          }
        }
      }).post();
    } else if (!apikey) {
      no_valid_apikey = true;
    }
  }
}).get();