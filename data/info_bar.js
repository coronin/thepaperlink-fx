// info_bar.js - thepaperlink-fx
// author: Liang Cai, 2012

var DEBUG = false,
  base_uri,
  apikey,
  pubmeder_ok,
  pubmeder_apikey,
  pubmeder_email,
  cloud_op,
  ezproxy_prefix,
  loading_gif,
  clippy_file,
  remote_jss,
  doc = document,
  pmids = '',
  pmidArray = [],
  old_title = '',
  search_term = '',
  onePage_calls = 0,
  title_obj;

if (typeof window.uneval === 'undefined') {
  window.uneval = function (a) {
    return ( JSON.stringify(a) ) || '';
  };
}

function t(n) { return doc.getElementsByTagName(n); }

function trim(s) { return ( s || '' ).replace( /^\s+|\s+$/g, '' ); }

function getPmid(zone, num) {
  var a = t(zone)[num].textContent,
    regpmid = /PMID:\s(\d+)\s/,
    ID, b, c, t_cont, t_strings, t_test, t_title;
  DEBUG && console.log(a);
    // swf_file = 'http://9.pl4.me/clippy.swf'; // need remote flash
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (t(zone)[num + 1].className.indexOf('rprtnum') > -1) {
        t(zone)[num + 2].setAttribute('id', ID[1]);
      } else {
        t(zone)[num - 2].setAttribute('id', ID[1]);
      }
      if (t(zone)[num].className === 'rprt') {
        t_cont = t(zone)[num + 2].textContent; // fx does not support innerText
        t_strings = t_cont.split(' [PubMed - ')[0].split('.');
        t_title = trim( t_strings[0] );
        t_cont = t_title +
          '.\r\n' + trim( t_strings[1] ) +
          '.\r\n' + trim( t_strings[2] ) +
          '. ' + trim( t_strings[3] ) +
          '. [' + ID[1] + ']\r\n';
      } else{
        t_strings = a.split('.');
        t_title = trim( t_strings[2] );
        t_cont = t_title +
          '.\r\n' + trim( t_strings[3] ) +
          '.\r\n' + trim( t_strings[0] ) +
          '. ' + trim( t_strings[1] ) +
          '. [' + ID[1] + ']\r\n';
      }
      DEBUG && console.log(t_cont);
      if (t(zone)[num].className === 'rprt') {
        b = num + 3;
        c = num + 3;  // 4
      } else { // display with abstract
        b = num + 1;
        c = num + 4;  // 5
      }
      jQuery( jQuery('<div>', {text: ' ', style: 'float:right;z-index:1;cursor:pointer'})
        .html('<img title="copy to clipboard" src="' + clippy_file + '" alt="copy" width="14" height="14" />')
      ).appendTo( zone + ':eq(' + b + ')'
      ).on('click', {t_cont:t_cont}, function (event) {
        var t_cont = event.data.t_cont;
        self.postMessage(['t_cont', t_cont]);
        jQuery(this).text('copy');
      });
      jQuery( jQuery('<span>', {text: 'citation status', id: 'citedBy' + ID[1],
        style: 'border-left:4px #fccccc solid;padding-left:4px;padding-right:4px;font-size:11px'})
      ).appendTo( zone + ':eq(' + c + ')'
      ).on('mouseover', function (event) {
        jQuery(this).text('citation status is generated locally by fetching Google Scholar pages (Chrome only)');
      })
      .click(function () {
        $(this).attr('target', '_blank');
        window.open('https://chrome.google.com/webstore/detail/kgdcooicefdfjcplcnehfpbngjccncko');
        return false;
      });
      pmids += ',' + ID[1];
      self.postMessage(['pmid_title', ID[1], t_title]);
    }
  }
}

function get_Json(pmids) {
  var i, div,
    need_insert = 1,
    url = '/api?flash=yes&a=fx1&pmid=' + pmids,
    loading_span = '<span style="font-weight:normal;font-style:italic"> fetching data from "the Paper Link"</span>&nbsp;&nbsp;<img src="' + loading_gif +
      '" width="16" height="11" alt="loading" />';
  if (search_term) {
    url += '&w=' + search_term + '&apikey=';
  } else {
    url += '&apikey=';
  }
  for (i = 0; i < t('h2').length; i += 1) {
    if (t('h2')[i].className === 'result_count') {
      need_insert = 0;
      title_obj = jQuery('h2:eq(' + i + ')');
      old_title = title_obj.html();
      title_obj.html(old_title + loading_span);
    }
  }
  if (need_insert) {
    jQuery('#messagearea').append('<h2>' + loading_span + '</h2>');
    title_obj = jQuery('#messagearea > h2');
  }
  onePage_calls += 1;
  self.postMessage(['url', url]);
}

function run() {
  var i, z;
  try {
    search_term = jQuery('#search_term').val();
  } catch (err) {
    DEBUG && console.log(err);
  }
  self.postMessage(['reset_scholar_count']);
  for (i = 0; i < t('div').length; i += 1) {
    if (t('div')[i].className === 'rprt' || t('div')[i].className === 'rprt abstract') {
      getPmid('div', i);
    } else if (!search_term && t('div')[i].className === 'print_term') {
      z = t('div')[i].textContent;
      if (z) {
        search_term = z.substr(8, z.length);
      }
    }
  }
  pmids = pmids.substr(1, pmids.length);
  pmidArray = pmids.split(',');
  if (pmids) {
    localStorage.setItem('thePaperLink_ID', pmidArray[0]);
    get_Json(pmids);
  }
}


self.on('message', function(msg) {
  DEBUG && console.log(msg);
  if (msg[0] === 'init') {
    base_uri = msg[1];
    apikey = msg[2];
    pubmeder_ok = msg[3];
    pubmeder_apikey = msg[4];
    pubmeder_email = msg[5];
    cloud_op = msg[6];
    ezproxy_prefix = msg[7];
    loading_gif = msg[8];
    clippy_file = msg[9];
    remote_jss = msg[10];
    var jquery_fn_ver = '1.4.2 1.4.3 1.4.4 1.5.0 1.5.1 1.5.2 1.6.0 1.6.1 1.6.2 1.6.3 1.6.4 1.7.0 1.7.1 1.7.2';
    if (typeof jQuery !== 'undefined' && jquery_fn_ver.indexOf(jQuery.fn.jquery) >= 0) {
      run();
    } else {
      DEBUG && console.log('too bad - no jQuery no go');
    }

  } else if (msg[0] === 'tj') {
    var pmid, div, div_html, i, j, k, S, styles, peaks,
      r = msg[1],
      bookmark_div = '<div id="css_loaded" class="thepaperlink" style="margin-left:10px;font-size:80%;font-weight:normal;cursor:pointer"> ';
    if (r.error) {
      title_obj.html(old_title +
        ' <span style="font-size:14px;font-weight:normal;color:red">"the Paper Link" error ' +
        uneval(r.error) + '</span>');
      return;
    }
    // @@@@ not allow by Mozilla
    if (remote_jss && !jQuery('#paperlink2_display').length) {
      peaks = doc.createElement('script');
      peaks.setAttribute('type', 'text/javascript');
      peaks.setAttribute('src', base_uri + '/jss?y=' + (Math.random()));
      doc.body.appendChild(peaks);
    }
    styles = '.Off { display: none !important;}'
      + '.thepaperlink {'
      + '  background: #e0ecf1;'
      + '  border:2px solid #dedede; border-top:2px solid #eee; border-left:2px solid #eee;'
      + '  padding: 2px 4px;'
      + '  border-radius: 4px;'
      + '  display: inline-block'
      + '}'
      + '.thepaperlink > a ,'
      + '.thepaperlink > span {'
      + '  margin: 0 6px'
      + '}'
      + 'a.thepaperlink-green {'
      + '  color: green'
      + '}'
      + 'a.thepaperlink-red {'
      + '  color: red'
      + '}'
      + '.thepaperlink-home {'
      + '  color: grey;'
      + '  text-decoration: none;'
      + '  cursor: pointer'
      + '}';
    if (!jQuery('#css_loaded').length) {
      S = doc.createElement('style');
      S.type = 'text/css';
      S.appendChild(doc.createTextNode(styles));
      doc.body.appendChild(S);
    }
    if (pubmeder_ok) {
      bookmark_div += '<span id="thepaperlink_saveAll">pubmeder&nbsp;all</span></div>';
    } else {
      bookmark_div += 'wanna save what you are reading? Login<a href="http://www.pubmeder.com/registration" target="_blank">PubMed-er</a></div>';
    }
    if (old_title) {
      title_obj.html(old_title + bookmark_div);
      if (jQuery('#thepaperlink_saveAll').length) {
        jQuery('#thepaperlink_saveAll').on('click', {pmid:pmids}, saveIt_pubmeder);
      }
    } else {
      title_obj.text('done');
      title_obj.fadeOut();
    }
    for (i = 0; i < r.count; i += 1) {
      pmid = r.item[i].pmid;
      jQuery('#' + pmid).append( jQuery('<div>', {class: 'thepaperlink'}) );
      div = jQuery('#' + pmid + '> div.thepaperlink');
      div.append( jQuery('<a>', {href: base_uri + '/?q=pmid:' + pmid,
        text: 'the Paper Link', class: 'thepaperlink-home', target: '_blank'}) );
      if (r.item[i].slfo && r.item[i].slfo !== '~' && parseFloat(r.item[i].slfo) > 0) {
        div.append( jQuery('<span>').text('impact ' + r.item[i].slfo) );
      }
      if (r.item[i].pdf) {
        div.append( jQuery('<a>', {href: ezproxy_prefix + r.item[i].pdf,
          text: 'direct pdf', class: 'thepaperlink-green', target: '_blank',
          id: 'thepaperlink_pdf' + pmid}) );
      } else if (r.item[i].pii) {
        self.postMessage(['pii_link', pmid, r.item[i].pii]);
        div.append( jQuery('<span>', {text: '', id: 'thepaperlink_pdf' + pmid}) );
      }
      if (r.item[i].pmcid) {
        div.append( jQuery('<a>', {href: 'https://www.ncbi.nlm.nih.gov/pmc/articles/' + r.item[i].pmcid + '/?tool=thepaperlinkClient',
          text: 'open access', target: '_blank',
          id: 'thepaperlink_pmc' + pmid}) );
      }
      if (r.item[i].doi) {
        div.append( jQuery('<a>', {href: ezproxy_prefix + 'http://dx.doi.org/' + r.item[i].doi,
          text: 'publisher', target: '_blank',
          id: 'thepaperlink_doi' + pmid}) );
      } else if (r.item[i].pii) {
        div.append( jQuery('<a>', {href: ezproxy_prefix + 'http://linkinghub.elsevier.com/retrieve/pii/' + r.item[i].pii,
          text: 'publisher', target: '_blank',
          id: 'thepaperlink_doi' + pmid}) );
      }
      if (r.item[i].f_v && r.item[i].fid) {
        div.append( jQuery('<a>', {href: ezproxy_prefix + 'http://f1000.com/' + r.item[i].fid,
          text: 'f1000 score ' + r.item[i].f_v, class: 'thepaperlink-red', target: '_blank',
          id: 'thepaperlink_f' + pmid}) );
      }
      if (pubmeder_ok || cloud_op) {
        div.append( jQuery('<span>', {text: 'save it', class: 'thepaperlink-home',
          id: 'thepaperlink_save' + pmid}).on('click', {pmid:pmid, cloud_op:cloud_op}, saveIt) );
      }
      if (apikey) {
        div.append( jQuery('<span>', {text: '...', class: 'thepaperlink-home',
          id: 'thepaperlink_rpt' + pmid}).on('click', {div:div, pmid:pmid}, function (event) {

            var box = event.data.div, pmid = event.data.pmid;
            box.append( jQuery('<span>', {text: 'email it', class: 'thepaperlink-home',
              id: 'thepaperlink_A' + pmid}).on('click', {pmid:pmid}, emailIt) );
            if (jQuery('#thepaperlink_pdf' + pmid).length) {
              if (jQuery('#thepaperlink_hidden' + pmid).length) {
                box.append( jQuery('<span>', {text: 'email it', class: 'thepaperlink-home',
                  id: 'thepaperlink_D' + pmid}).on('click', {pmid:pmid, no_email:0}, email_pdf) );
                jQuery('#thepaperlink_A' + pmid).html(jQuery.browser.version);
                jQuery('#thepaperlink_A' + pmid).addClass('Off');
              }
              box.append( jQuery('<span>', {text: 'wrong link?', class: 'thepaperlink-home',
                id: 'thepaperlink_B' + pmid}).on('click', {pmid:pmid}, reportWrongLink) );
            }
            box.append( jQuery('<span>', {text: 'more info?', class: 'thepaperlink-home',
              id: 'thepaperlink_C' + pmid}).on('click', {pmid:pmid}, needInfo) );
            jQuery('#thepaperlink_rpt' + pmid).remove();

          }) );
      }
      if (apikey && r.item[i].pdf) {
        div.append( jQuery('<span>', {text: '', style: 'display:none !important',
          id: 'thepaperlink_hidden' + pmid}) );
      }
      if (jQuery('#thepaperlink_hidden' + pmid).length) {
        doc.getElementById('thepaperlink_hidden' + pmid).addEventListener('email_pdf', function () {
          var eventData = this.textContent,
            pmid = this.id.substr(19),
            pdf = doc.getElementById('thepaperlink_pdf' + pmid).href,
            no_email_span = doc.getElementById('thepaperlink_save' + pmid).className;
          if ( (' ' + no_email_span + ' ').indexOf(' no_email ') > -1 ) {
            self.postMessage(['upload_pdf', eventData, pdf, pmid, apikey, 1]);
          } else {
            self.postMessage(['upload_pdf', eventData, pdf, pmid, apikey, 0]);
            try {
              doc.getElementById('thepaperlink_D' + pmid).setAttribute('style', 'display:none');
            } catch (err) {
              DEBUG && console.log(err);
            }
          }
        });
      }
      k = pmidArray.length;
      for (j = 0; j < k; j += 1) {
        if (pmid === pmidArray[j]) {
          pmidArray = pmidArray.slice(0, j).concat(pmidArray.slice(j + 1, k));
      } }
    }
    if (pmidArray.length > 0) {
      if (pmidArray.length === k) {
        DEBUG && console.log('getting nothing, failed on ' + k);
      } else {
        DEBUG && console.log('call for ' + k + ', not get ' + pmidArray.length);
        title_obj.html(old_title + bookmark_div + '&nbsp;&nbsp;<img src="' + loading_gif +
          '" width="16" height="11" alt="loading" />');
        onePage_calls += 1;
        self.postMessage(['url', '/api?a=fx2&pmid=' + pmidArray.join(',') + '&apikey=']);
      }
    }
    DEBUG && console.log('onePage_calls: ' + onePage_calls);

  } else if (msg[0] === 'wrong') {
    alert(msg[1]);
  } else if (msg[0] === 'except') {
    if (!search_term) {
      search_term = doc.URL.split('/pubmed/')[1];
    }
    if (!search_term) {
      search_term = localStorage.getItem('thePaperLink_ID');
    }
    title_obj.html(old_title +
      ' <span style="font-size:14px;font-weight:normal;color:red">Error! Try ' +
      '<button onclick="window.location.reload()">reload</button> or ' +
      '<b>Search</b> <a href="http://www.thepaperlink.com/?q=' + search_term +
      '" target="_blank">the Paper Link</a>' +
      '<span style="float:right;cursor:pointer" id="thepaperlink_alert">&lt;!&gt;</span></span>');
    jQuery('#thepaperlink_alert').on('click', function () {
      if (apikey) {
        jQuery.post(base_uri + '/',
          {'pmid': '1', 'apikey': apikey, 'action': 'alert_dev'},
          function () {
            jQuery('#thepaperlink_alert').text('done');
            jQuery('#thepaperlink_alert').fadeOut();
          }
        ).fail(function () { alert('Error 0'); });
      } else {
        alert('You have to be a registered user to be able to alert the developer.');
      }
    });
  } else if (msg[0] === 'g_scholar') {
    try {
      if (msg[2] === 1 && msg[3] === 1) {
        jQuery('#citedBy' + msg[1]).text('trying');
      } else if (msg[2] === 0 && msg[3] === 0) {
        jQuery('#citedBy' + msg[1]).text('Really? No one cited it yet. Is it a very recent publication?');
        if (doc.URL.indexOf('://www.ncbi.nlm.nih.gov/') > 0) {
          jQuery('#citedBy' + msg[1]).fadeOut();
        }
      } else if (msg[2] && msg[3]) {
        jQuery('#citedBy' + msg[1]).text('Cited by ' + msg[2] + ' times (in Google Scholar)');
        jQuery('#citedBy' + msg[1]).click(function () {
          $(this).attr('target', '_blank');
          window.open('http://scholar.google.com' + msg[3]);
          return false;
        });
      }
    } catch (err) {
      DEBUG && console.log(err);
    }
  } else if (msg[0] === 'el_link') {
    try {
      if (msg[2] === 1 && doc.URL.indexOf('://www.ncbi.nlm.nih.gov/') === -1) {
        jQuery('#' + msg[1]).text('trying');
      } else {
        if (doc.URL.indexOf('://www.ncbi.nlm.nih.gov/') > 0) {
          jQuery('#thepaperlink' + msg[1]).text('file link');
          jQuery('#thepaperlink' + msg[1]).click(function () {
            $(this).attr('target', '_blank');
            window.open(msg[2]);
            return false;
          });
        } else {
          jQuery('#' + msg[1]).text('&raquo; the file link');
          jQuery('#' + msg[1]).click(function () {
            $(this).attr('target', '_blank');
            window.open(msg[2]);
            return false;
          });
        }
      }
    } catch (err) {
      DEBUG && console.log(err);
    }
  }
});

// below from server jss

function needInfo(event) {
      var answer = confirm('\n\nwant more information about this item?\n'),
        pmid = event.data.pmid;
      if (answer) {
        jQuery.post(base_uri + '/',
          {'pmid': pmid, 'apikey': apikey, 'action': 'more_info'},
          function () {
            jQuery('#thepaperlink_C' + pmid).text('done');
            jQuery('#thepaperlink_C' + pmid).fadeOut();
          }
        ).fail(function () { alert('Error 3'); });
      }
}

function reportWrongLink(event) {
      var answer = confirm('\n\nthe pdf link of this item is wrong: are you sure?\n'),
        pmid = event.data.pmid;
      if (answer) {
        jQuery.post(base_uri + '/',
          {'pmid': pmid, 'apikey': apikey, 'action': 'wrong_link'},
          function () {
            jQuery('#thepaperlink_B' + pmid).text('done');
            jQuery('#thepaperlink_B' + pmid).fadeOut();
          }
        ).fail(function () { alert('Error 4'); });
      }
}

function emailIt(event) {
      var answer = confirm('\n\nemail the abstract of this paper to you?\n'),
        pmid = event.data.pmid;
      if (answer) {
        jQuery.post(base_uri + '/',
          {'pmid': pmid, 'apikey': apikey, 'action': 'email'},
          function () {
            jQuery('#thepaperlink_A' + pmid).text('done');
            jQuery('#thepaperlink_A' + pmid).fadeOut();
          }
        ).fail(function () { alert('Error 5'); });
      }
}

function email_pdf(event) {
      var pmid = event.data.pmid,
        bv = jQuery('#thepaperlink_A' + pmid).html(),
        args = {'apikey': apikey},
        answer = null;
      if (event.data.no_email) {
        args = {'apikey': apikey, 'no_email': 1};
      } else {
        answer = confirm('\nEmail the pdf of this paper to you?\n\nCaution: it might fail, then only the abstract will be sent [' + bv + ']\n');
      }
      if (answer || no_email) {
        jQuery.get(base_uri + '/file/new', args,
          function (upload_url) {
            var dom = doc.getElementById('thepaperlink_hidden' + pmid), customEvent = doc.createEvent('Event');
            customEvent.initEvent('email_pdf', true, true);
            dom.textContent = upload_url;
            if (!no_email) {
              jQuery('#thepaperlink_D' + pmid).text('done');
              jQuery('#thepaperlink_D' + pmid).fadeOut();
            } else {
              jQuery('#thepaperlink_save' + pmid).addClass('no_email');
            }
            dom.dispatchEvent(customEvent);
          }
        ).fail(function () { alert('Error 6'); });
      }
}

function saveIt_pubmeder(event) {
      var args = {'apikey' : pubmeder_apikey,
                   'email' : pubmeder_email,
                    'pmid' : event.data.pmid},
        url = 'https://pubmeder-hrd.appspot.com';
      if (base_uri.indexOf('.appspot.') === -1) {
        url = 'http://1.pl4.me';
      }
      jQuery.get(url + '/input', args, function (data) {
        var d = jQuery.parseJSON(data); // JSON.parse()
        if (d.respond > 1) {
          jQuery('#thepaperlink_saveAll').text('done');
          jQuery('#thepaperlink_saveAll').remove();
        }
        if (d.input.search(/,/) >= 0) {
          jQuery.each(d.input.split(','), function (i, id) {
            jQuery('#thepaperlink_save' + id).text('done');
            jQuery('#thepaperlink_save' + id).fadeOut();
          });
        } else {
          jQuery('#thepaperlink_save' + d.input).text('done');
          jQuery('#thepaperlink_save' + d.input).fadeOut();
        }
      }).fail(function () { alert('Error 2'); });
}

function saveIt_thepaperlink(pmid) {
      jQuery.post(base_uri + '/api',
        {'pmid': pmid, 'apikey': apikey},
        function () {
          jQuery('#thepaperlink_save' + pmid).text('done');
          jQuery('#thepaperlink_save' + pmid).fadeOut();
        }
      ).fail(function () { alert('Error 1'); });
}

function saveIt(event) {
      var pmid = event.data.pmid,
        cloud_op = event.data.cloud_op;
      jQuery('#thepaperlink_save' + pmid).html('trying');
      if (apikey && cloud_op && cloud_op.indexOf('d') >= 0) {
        event.data.no_pmid = 1;
        email_pdf(event);
      }
      if (apikey && cloud_op && (cloud_op.indexOf('m') >= 0 || cloud_op.indexOf('f') >= 0 || cloud_op.indexOf('b') >= 0)) {
        saveIt_thepaperlink(pmid);
      } else if (pubmeder_apikey && pubmeder_email) {
        saveIt_pubmeder(event);
      }
}
