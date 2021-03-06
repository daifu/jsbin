var consoleTest = /(^.|\b)console\./;

var iframedelay = (function () {
  var iframedelay = { active : false },
      iframe = document.createElement('iframe'),
      doc,
      callbackName = '__callback' + (+new Date);

  iframe.style.height = iframe.style.width = '1px';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);
  doc = iframe.contentDocument || iframe.contentWindow.document;

  window[callbackName] = function (width) {
    iframedelay.active = width === 0;
    try {
      iframe.parentNode.removeChild(iframe);
      delete window[callbackName];
    } catch (e){}
  };

  try {
    doc.open();
    doc.write('<script>window.parent.' + callbackName + '(window.innerWidth)</script>');
    doc.close();
  } catch (e) {
    iframedelay.active = true;
  }
  
  return iframedelay;
}());

var re = null;

function two(i) {
  return ('0'+i).slice(-2);
}

function getPreparedCode() {
  // init the regular expression cache because this function
  // is called much earlier than the above code is actually encountered
  // yay for massive .js app!
  if (!re) {
    re = {
      docReady: /\$\(document\)\.ready/,
      shortDocReady: /\$\(function/,
      console: /(^.|\b)console\./g,
      script: /<\/script/ig,
      code: /%code%/,
      title: /<title>(.*)<\/title>/i,
      winLoad: /window\.onload\s*=/,
      scriptopen: /<script/gi
    };
  }

  // reset all the regexp positions for reuse
  re.docReady.lastIndex = 0;
  re.shortDocReady.lastIndex = 0;
  re.console.lastIndex = 0;
  re.script.lastIndex = 0;
  re.code.lastIndex = 0;
  re.title.lastIndex = 0;
  re.winLoad.lastIndex = 0;
  re.scriptopen.lastIndex = 0;

  var parts = [],
      source = '',
      js = '',
      css = '',
      close = '',
      hasHTML = false,
      hasCSS = false,
      hasJS = false,
      date = new Date();

  try {
    source = editors.html.render();
  } catch (e) {
    console && console.error(e.message);
  }

  hasHTML = !!$.trim(source);

  try {
    js = editors.javascript.render();

    if (js.trim()) js += '\n\n// created @ ' + two(date.getHours()) + ':' + two(date.getMinutes()) + ':' + two(date.getSeconds());
  } catch (e) {
    console && console.error(e.message);
  }

  hasJS = !!$.trim(js);

  try {
    css = editors.css.render();
  } catch (e) {
    console && console.error(e.message);
  }

  hasCSS = !!$.trim(css);

  // escape any script tags in the JS code, because that'll break the mushing together
  js = js.replace(re.script, '<\\/script');

  // note that I'm using split and reconcat instead of replace, because if the js var
  // contains '$$' it's replaced to '$' - thus breaking Prototype code. This method
  // gets around the problem.
  if (!hasHTML && hasJS) {
    source = "<pre>\n" + js + "</pre>";
  } else if (re.code.test(source)) {
    parts = source.split('%code%');
    source = parts[0] + js + parts[1];
  } else if (hasJS) {
    close = '';
    if (source.indexOf('</body>') !== -1) {
      parts.push(source.substring(0, source.lastIndexOf('</body>')));
      parts.push(source.substring(source.lastIndexOf('</body>')));

      source = parts[0];
      close = parts.length == 2 && parts[1] ? parts[1] : '';
    }

    // RS: not sure why I ran this in closure, but it means the expected globals are no longer so
    // js = "window.onload = function(){" + js + "\n}\n";
    var type = jsbin.panels.panels.javascript.type ? ' type="text/' + jsbin.panels.panels.javascript.type + '"' : '';
    source += "<script" + type + ">\n" + js + "\n</script>\n" + close;
  }

  // redirect console logged to our custom log while debugging
  if (re.console.test(source)) {
    if (jsbin.panels.panels.console.visible) {
      source = source.replace(re.console, 'window.top._console.');
    } else {
      source = source.replace(re.console, 'window.top.console.');
    }
  }

  if (!hasHTML && !hasJS && hasCSS) {
    source = "<pre>\n" + css + "</pre>";
  } else if (css) {
    parts = [];
    close = '';
    if (source.indexOf('</head>') !== -1) {
      parts.push(source.substring(0, source.lastIndexOf('</head>')))
      parts.push(source.substring(source.lastIndexOf('</head>')));

      source = parts[0];
      close = parts.length == 2 && parts[1] ? parts[1] : '';
    }
    source += '<style>\n' + css + '\n</style>\n' + close;
  }

  // specific change for rendering $(document).ready() because iframes doesn't trigger ready (TODO - really test in IE, may have been fixed...)
  // if (re.docReady.test(source)) {
  //   source = source.replace(re.docReady, 'window.onload = ');
  // } else if (re.shortDocReady.test(source)) {
  //   source = source.replace(re.shortDocReady, 'window.onload = (function');
  // }

  if (jsbin.ie && re.scriptopen.test(source)) {
    source = source.replace(re.scriptopen, '<script defer'); 
  }

  // read the element out of the source code and plug it in to our document.title
  var newDocTitle = source.match(re.title);
  if (newDocTitle !== null && newDocTitle[1] !== documentTitle) {
    documentTitle = newDocTitle[1];
    document.title = documentTitle + ' - ' + 'JS Bin';
  }

  return source;
}

// function renderPreview() {
//   var doc = $('#preview iframe')[0], 
//       win = doc.contentDocument || doc.contentWindow.document,
//       source = getPreparedCode();

//   var run = function () {
//     win.open();
//     if (jsbin.settings.debug) {
//       win.write('<pre>' + source.replace(/[<>&]/g, function (m) {
//         if (m == '<') return '&lt;';
//         if (m == '>') return '&gt;';
//         if (m == '"') return '&quot;';
//       }) + '</pre>');
//     } else {
//       win.write(source);
//     }
//     win.close();
//   };

//   // WebKit requires a wait time before actually writing to the iframe
//   // annoyingly it's not consistent (I suspect WebKit is the buggy one)
//   if (iframedelay.active) {
//     // this setTimeout allows the iframe to be rendered before our code
//     // runs - thus allowing us access to the innerWidth, et al
//     setTimeout(run, 10);
//   } else {
//     run();
//   }
// }
