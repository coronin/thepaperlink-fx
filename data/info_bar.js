// info_bar.js - thepaperlink-fx
// author: Liang Cai, 2012

var base_uri,
  apikey,
  pubmeder_ok,
  pubmeder_apikey,
  pubmeder_email,
  cloud_op,
  ezproxy_prefix,
  loading_gif,
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
    ID, b, content, tmp, temp,
    swf_file = 'http://9.pl4.me/clippy.swf'; // need flash
  if (regpmid.test(a)) {
    ID = regpmid.exec(a);
    if (ID[1]) {
      if (t(zone)[num + 1].className === 'rprtnum') {
        t(zone)[num + 2].setAttribute('id', ID[1]);
      } else {
        t(zone)[num - 2].setAttribute('id', ID[1]);
      }
      if (t(zone)[num].className === 'rprt') {
        content = t(zone)[num + 2].textContent; // fx does not support innerText
        tmp = content.split(' [PubMed - ')[0].split('.');
        content = trim(tmp[0]) +
          '.\r\n' + trim(tmp[1]) +
          '.\r\n' + trim(tmp[2]) +
          '. ' + trim(tmp[3]);
        temp = trim(tmp[tmp.length - 1]);
        if (temp.indexOf('[Epub ahead of print]') > -1) {
          content += '. [' + temp.substr(22) + ']\r\n';
        } else {
          content += '. [' + temp + ']\r\n';
        }
        b = '<div style="float:right;z-index:1"><embed src="' + swf_file + '" wmode="transparent" width="110" height="14" quality="high" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" FlashVars="text=' + content + '" /></div>';
        jQuery(zone + ':eq(' + (num+3) + ')').append(b);
      }
      pmids += ',' + ID[1];
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
    console.log(err);
  }
  for (i = 0; i < t('div').length; i += 1) {
    if (t('div')[i].className === 'rprt' || t('div')[i].className === 'rprt abstract') { //  && t('div')[i].className !== 'abstract'
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
  if (msg[0] === 'init') {
    base_uri = msg[1];
    apikey = msg[2];
    pubmeder_ok = msg[3];
    pubmeder_apikey = msg[4];
    pubmeder_email = msg[5];
    cloud_op = msg[6];
    ezproxy_prefix = msg[7];
    loading_gif = msg[8];
    var jquery_fn_ver = '1.4.2 1.4.3 1.4.4 1.5.0 1.5.1 1.5.2 1.6.0 1.6.1 1.6.2 1.6.3 1.6.4 1.7.0 1.7.1';
    if (typeof jQuery !== 'undefined' && jquery_fn_ver.indexOf(jQuery.fn.jquery) >= 0) {
      console.log('jQuery is ready - let\'s do it');
      run();
    } else {
      console.log('too bad - no jQuery no go');
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
    // an essential component for this addon, dynamically generated
    if (!jQuery('#paperlink2_display').length) {
      peaks = doc.createElement('script');
      peaks.setAttribute('type', 'text/javascript');
      peaks.setAttribute('src', base_uri + '/jss?y=' + (Math.random()));
      doc.body.appendChild(peaks);
    }
    styles = '.thepaperlink {'
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
      //GM_addStyle(styles);
    }
    if (pubmeder_ok) {
      bookmark_div += '<span id="thepaperlink_saveAll">pubmeder&nbsp;all</span></div>';
    } else {
      bookmark_div += 'wanna save what you are reading? Login<a href="http://www.pubmeder.com/registration" target="_blank">PubMed-er</a></div>';
    }
    if (old_title) {
      title_obj.html(old_title + bookmark_div);
      if (jQuery('#thepaperlink_saveAll').length) {
        jQuery('#thepaperlink_alert').click( saveIt_pubmeder(pmids, pubmeder_apikey, pubmeder_email) );
      }
    } else {
      title_obj.fadeOut();
    }
    for (i = 0; i < r.count; i += 1) {
      pmid = r.item[i].pmid;
      jQuery('#' + pmid).append( jQuery('<div>', {class: 'thepaperlink'}) );
      div = jQuery('#' + pmid + '> .thepaperlink');
      div.append( jQuery('<a>', {href: base_uri + '/?q=pmid:' + pmid,
        text: 'the Paper Link', class: 'thepaperlink-home', target: '_blank'}) );
      if (r.item[i].slfo && r.item[i].slfo !== '~' && parseFloat(r.item[i].slfo) > 0) {
        div.append( jQuery('<span>').text('impact ' + r.item[i].slfo) );
      }
      if (r.item[i].pdf) {
        div.append( jQuery('<a>', {href: ezproxy_prefix + r.item[i].pdf,
          text: 'direct pdf', class: 'thepaperlink-green', target: '_blank',
          id: 'thepaperlink_pdf' + pmid}) );
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
          id: 'thepaperlink_save' + pmid}).click(

            saveIt(pmid, pubmeder_apikey, pubmeder_email, apikey, cloud_op)

          ) );
      }
      if (apikey) {
        div.append( jQuery('<span>', {text: '...', class: 'thepaperlink-home',
          id: 'thepaperlink_rpt' + pmid}).click(

            show_me_the_money(pmid, apikey)

          ) );
      }
      if (apikey && r.item[i].pdf) {
        div.append( jQuery('<span>', {text: '', style: 'display:none !important',
          id: 'thepaperlink_hidden' + pmid}) );
      }
      if (jQuery('#thepaperlink_hidden' + pmid).length) {
        doc.getElementById('thepaperlink_hidden' + pmid).addEventListener('email_pdf', function () {
          var eventData = this.innerText,
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
              console.log(err);
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
        console.log('getting nothing, failed on ' + k);
      } else {
        // console.log('call for ' + k + ', not get ' + pmidArray.length);
        title_obj.html(old_title + bookmark_div + '&nbsp;&nbsp;<img src="' + loading_gif +
          '" width="16" height="11" alt="loading" />');
        onePage_calls += 1;
        self.postMessage(['url', '/api?a=fx2&pmid=' + pmidArray.join(',') + '&apikey=']);
      }
    }
    // console.log('onePage_calls: ' + onePage_calls);

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
    jQuery('#thepaperlink_alert').click(function () {
      if (apikey) {
        jQuery.ajax({
          type: 'POST',
          url: base_uri + '/',
          data: {'pmid': '1', 'apikey': apikey, 'action': 'alert_dev'},
          success: function () {
            jQuery('#thepaperlink_alert').fadeOut('fast');
          }
        });
      } else {
        alert('You have to be a registered user to be able to alert the developer.');
      }
    });
  }
});