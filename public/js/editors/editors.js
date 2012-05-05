//= require "codemirror"
//= require "mobileCodeMirror"
//= require "library"
//= require "unsaved"
//= require "panel"
//= require "../render/live"
//= require "../render/console"
//= require "keycontrol"

var panels = {};

panels.getVisible = function () {
  var panels = this.panels,
      visible = [];
  for (var panel in panels) {
    if (panels[panel].visible) visible.push(panels[panel]);
  }
  return visible;
};

panels.save = function () {
  var visible = this.getVisible(),
      state = {},
      panel;

  for (var i = 0; i < visible.length; i++) {
    panel = visible[i];
    state[panel.name] = panel.$el.css('left');
  }

  localStorage.setItem('jsbin.panels', JSON.stringify(state));
}

panels.restore = function () {
  // if there are panel names on the hash (v2 of jsbin) or in the jquery (v3)
  // then restore those specific panels and evenly distribute them.
  var open = [],
      location = window.location,
      search = location.search.substring(1),
      hash = location.hash.substring(1),
      toopen = search || hash ? (search || hash).split(',') : [],
      state = JSON.parse(localStorage.getItem('jsbin.panels') || '{}'),
      name = '',
      i = 0,
      panel = null,
      init = [],
      panelURLValue = '',
      openWithSameDimensions = false,
      width = window.innerWidth;

  // otherwise restore the user's regular settings
  // also set a flag indicating whether or not we should save the panel settings
  // this is based on whether they're on jsbin.com or if they're on an existing
  // bin. Also, if they hit save - *always* save their layout.
  if (location.pathname && location.pathname !== '/') {
    panels.saveOnExit = false;
  } else {
    panels.saveOnExit = true;
  }

  // TODO decide whether the above code I'm trying too hard.

  /* Boot code */
  // then allow them to view specific panels based on comma separated hash fragment
  if (toopen.length) {
    for (name in state) {
      if (toopen.indexOf(name) !== -1) {
        i++;
      }
    }

    if (i === toopen.length) openWithSameDimensions = true;

    for (i = 0; i < toopen.length; i++) {
      panelURLValue = '';
      name = toopen[i];

      // if name contains an `=` it means we also need to set that particular panel to that code
      if (name.indexOf('=') !== -1) {
        panelURLValue = name.substring(name.indexOf('=') + 1);
        name = name.substring(0, name.indexOf('='));
      }

      if (panels.panels[name]) {
        panel = panels.panels[name];
        // console.log(name, 'width', state[name], width * parseFloat(state[name]) / 100);
        if (panel.editor && panelURLValue) {
          panel.setCode(decodeURIComponent(panelURLValue));
        }

        if (openWithSameDimensions) {
          panel.show(width * parseFloat(state[name]) / 100);
        } else {
          panel.show();
        }
        init.push(panel);
      } 
    }

    // support the old jsbin v1 links directly to the preview
    if (toopen.length === 1 && toopen[0] === 'preview') {
      panels.panels.live.show();
    }

    if (!openWithSameDimensions) this.distribute();
  } else {
    for (name in state) {
      panels.panels[name].show(width * parseFloat(state[name]) / 100);
    }
  }

  // now restore any data from sessionStorage
  // TODO add default templates somewhere
  // var template = {};
  // for (name in this.panels) {
  //   panel = this.panels[name];
  //   if (panel.editor) {
  //     // panel.setCode(sessionStorage.getItem('jsbin.content.' + name) || template[name]);
  //   }
  // }

  for (i = 0; i < init.length; i++) {
    init[i].init();
  }

  if (panels.getVisible().length) $body.addClass('panelsVisible');

};

panels.savecontent = function () {
  // loop through each panel saving it's content to sessionStorage
  var name, panel;
  for (name in this.panels) {
    panel = this.panels[name];
    if (panel.editor) sessionStorage.setItem('jsbin.content.' + name, panel.getCode());
  }
};

panels.focus = function (panel) {
  this.focused = panel;
  if (panel) {
    $('.panel').removeClass('focus').filter('.' + panel.id).addClass('focus');
  }
}

// evenly distribute the width of all the visible panels
panels.distribute = function () {
  var visible = $('#source .panelwrapper:visible'),
      width = 100,
      height = 0,
      innerW = window.innerWidth - (visible.length - 1), // to compensate for border-left
      innerH = $('#source').outerHeight(),
      left = 0,
      right = 0,
      top = 0,
      panel,
      nestedPanels = [];

  if (visible.length) {
    $body.addClass('panelsVisible');

    // visible = visible.sort(function (a, b) {
    //   return a.order < b.order ? -1 : 1;
    // });

    width = 100 / visible.length;
    for (var i = 0; i < visible.length; i++) {
      panel = $.data(visible[i], 'panel');
      right = 100 - (width * (i+1));
      panel.$el.css({ top: 0, bottom: 0, left: left + '%', right: right + '%' });
      panel.splitter.trigger('init', innerW * left/100);
      panel.splitter[i == 0 ? 'hide' : 'show']();
      left += width;

      nestedPanels = $(visible[i]).find('.panel');
      if (nestedPanels.length > 1) {
        top = 0;
        nestedPanels = nestedPanels.filter(':visible');
        height = 100 / nestedPanels.length;
        nestedPanels.each(function (i) {
          bottom = 100 - (height * (i+1));
          var panel = jsbin.panels.panels[$.data(this, 'name')];
          // $(this).css({ top: top + '%', bottom: bottom + '%' });
          $(this).css('top', top + '%');
          $(this).css('bottom', bottom + '%' );
          if (panel.splitter.hasClass('vertical')) {
            panel.splitter.trigger('init', innerH * top/100);
            panel.splitter[i == 0 ? 'hide' : 'show']();
          }
          top += height;
        });
      }
    }
  } else {
    $('#history').show();
    setTimeout(function () {
      $body.removeClass('panelsVisible');
    }, 100); // 100 is on purpose to add to the effect of the reveal
  }
};

panels.show = function (panelId) {
  this.panels[panelId].show();
  if (this.panels[panelId].editor) {
    this.panels[panelId].editor.focus();
  }
  this.panels[panelId].focus();
}

panels.hideAll = function () {
  var visible = panels.getVisible(),
      i = visible.length;
  while (i--) {
    visible[i].hide();
  }
}

// dirty, but simple
Panel.prototype.distribute = function () {
  panels.distribute();
};

jsbin.panels = panels;

var editors = panels.panels = {
  html: new Panel('html', { editor: true, label: 'HTML' }),
  css: new Panel('css', { editor: true, label: 'CSS' }),
  javascript: new Panel('javascript', { editor: true, label: 'JavaScript', init: function () {
    // checkForErrors();
  } }),
  console: new Panel('console', { label: 'Console' }),
  live: new Panel('live', { label: 'Output', show: function () {
    // contained in live.js
    var panel = this;
    $(document).bind('codeChange.live', function (event, data) {
      if (panels.ready) {
        if (jsbin.settings.includejs === false && data.panelId === 'javascript') {
          // ignore
        } else if (panel.visible) {
          throttledPreview();
        }
      }
    });
    renderLivePreview();
  } })
};


// jsconsole.init(); // sets up render functions etc.
editors.live.settings.render = function () {
  editors.console.render();
  renderLivePreview();
};

// IMPORTANT this is nasty, but the sequence is important, because the
// show/hide method is being called as the panels are being called as
// the panel is setup - so we hook these handlers on *afterwards*.
panels.update = function () {
  var visiblePanels = panels.getVisible(),
      visible = [],
      i = 0;
  for (i = 0; i < visiblePanels.length; i++) {
    visible.push(visiblePanels[i].name);
  }

  if (history.replaceState) {
    history.replaceState(null, null, '?' + visible.join(','));
  } else {
    // :( this will break jquery mobile - but we're talking IE only at this point, right?
    location.hash = '#' + visible.join(',');
  }
}


Panel.prototype._show = Panel.prototype.show;
Panel.prototype.show = function () { 
  this._show.apply(this, arguments);
  panels.update();
}

Panel.prototype._hide = Panel.prototype.hide;
Panel.prototype.hide = function () { 
  this._hide.apply(this, arguments);
  panels.update();
}



panels.restore();
panels.focus(panels.getVisible()[0] || null);

// allow panels to be reordered - TODO re-enable
(function () {
  var panelsEl = document.getElementById('panels'),
      moving = null;

  panelsEl.ondragstart = function (e) { 
    if (e.target.nodeName == 'A') {
      moving = e.target;
    } else {
      return false;
    }
  };

  panelsEl.ondragover = function (e) { 
    console.log(e)
    return false; 
  };

  panelsEl.ondragend = function () { 
    moving = false;
    return false; 
  };

  panelsEl.ondrop = function (e) {
    console.log(e.dataTransfer);
    if (moving) {

    }
    return false;
  };

});


var editorsReady = setInterval(function () {
  var ready = true,
      resizeTimer = null,
      panel,
      panelId;

  for (panelId in panels.panels) {
    panel = panels.panels[panelId];
    if (panel.visible && !panel.ready) ready = false;
  }

  panels.ready = ready;

  if (ready) {
    clearInterval(editorsReady);
    // panels.ready = true;
    // if (typeof editors.onReady == 'function') editors.onReady();
    // panels.distribute();

    // if live is visible, render it
    if (panels.panels.live.visible) {
      panels.panels.live.render();
    }

    if (panels.panels.console.visible) {
      panels.panels.console.render();
    }


    $(window).resize(function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        $document.trigger('sizeeditors');
      }, 100);
    });

    $document.trigger('sizeeditors');
    $document.trigger('jsbinReady');
  }
}, 100);