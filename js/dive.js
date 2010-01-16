/**
 * supplant() does variable substitution on the string. It scans
 * through the string looking for expressions enclosed in {} braces.
 * If an expression is found, use it as a key on the object,
 * and if the key has a string value or number value, it is
 * substituted for the bracket expression and it repeats.
 */
String.prototype.supplant = function(o) {
  return this.replace(/{([^{}]*)}/g,
    function(a, b) {
      var r = o[b];
      return typeof r === 'string' || typeof r === 'number' ? r : a;
    }
  );
};


var Dive = {};

Dive.Common = {
  escape: function(s) {
    var chars = {
      '"' : '\\"',
      ' ' : '+'
    };
    return s.replace(/[" ]/g, function(c){
      return chars[c];
    });
  },

  strip: function(s) {
    var chars = {
      '"' : ' '
    };
    return s.replace(/["]/g, function(c){
      return chars[c];
    });
  },

  thrust: function(template, data) {
    var result = '';
    if ($.isArray(data)) {
      $.each(data, function(i, v) {
        result += template.supplant(v);
      });
    } else {
      result += template.supplant(data);
    }
    return result;
  }
};


Dive.Widget = function(params) {
  this.name = params.name;
  this.color = params.color;
  this.scrollable = params.scrollable;
  this.limit = params.limit || 1;
  this.offset = 1;
  this.getQuery = params.getQuery;
  this.template = params.template;
  this.init = params.init;

  this.$elem = $('<div class="widget corners"><div class="widget_wrap"><div class="widget_holder"><h2 class="widget_title"></h2><div class="widget_content"></div></div></div></div>');

  this.$elem.addClass(this.color);

  this.$wrap = this.$elem.find('.widget_wrap');
  this.$holder = this.$elem.find('.widget_holder');

  var that = this;

  if (this.scrollable) {
    this.$elem.addClass('scrollable');
    this.$elem.find('.widget_wrap').scroll(function() {
      that.onScroll();
    });
  }

  this.$title = this.$elem.find('.widget_title');
  this.$title.html(this.name);

  this.$content = this.$elem.find('.widget_content');

  if (typeof this.init === 'function') {
    this.init(this);
  }

  this.$elem.appendTo('.widgets');
};


Dive.Widget.prototype = {
  onScroll: function() {
    if ((this.$wrap.scrollTop() > 0) && (this.$wrap.scrollTop() + this.$wrap.height() + 50 > this.$holder.height())) {
      this.offset = this.offset + 5;
      this.search();
    }
  },

  search: function(text) {
    if (text) {
      this.text = text;
      this.offset = 1;
      this.$wrap.scrollTop(0);
      this.$elem.find('.loading_more').remove();
      this.loading = false;
      this.nothing = false;
    }

    if (!this.text || this.loading || this.nothing) { return; }

    this.loading = true;

    if (this.offset === 1) {
      this.$content.empty();
      this.$elem.addClass('loading');
    } else {
      this.$elem.append('<div class="loading_more">Loading more&hellip;</div>');
    }

    var that = this;
    var check = this.text;

    $.ajax({
      cache: true,
      type: 'GET',
      url: 'http://query.yahooapis.com/v1/public/yql',
      data: {
        q: this.getQuery(this, this.text),
        format: 'json',
        diagnostics: false,
        env: 'store://datatables.org/alltableswithkeys'
      },
      dataType: 'jsonp',
      success: function(data) {
        that.show(data, check);
      }
    });
  },

  show: function(data, check) {
    if (this.text !== check) { return; }

    var content = '';

    if (data && data.query && data.query.results) {
      content = this.template(this, data.query.results);
    } else {
      content = '<p>Sorry, nothing found.</p>';
      this.nothing = true;
    }

    if (this.offset === 1) {
      this.$elem.removeClass('loading');
      this.$content.html(content);
    } else {
      this.$elem.find('.loading_more').remove();
      this.$content.append(content);
    }

    this.loading = false;
  }
};


Dive.Controller = {
  widgets: [],

  addWidget: function(params) {
    var widget = new Dive.Widget(params);
    this.widgets.push(widget);
  },

  search: function(text) {
    $.each(this.widgets, function(i, v) {
      v.search(text);
    });
  }
};


$(function() {
  Dive.Controller.addWidget({
    name: 'Bing',
    color: 'red',
    scrollable: true,
    limit: 5,
    getQuery: function(widget, text) {
      return 'select Url, Title, Description from microsoft.bing.web(0) where query="' + Dive.Common.escape(text) + '" limit ' + widget.limit + ' offset ' + widget.offset;
    },
    template: function(widget, results) {
      var tpl = '<li><div class="title"><a href="{Url}" target="_blank">{Title}</a></div><div class="description">{Description}</div><div class="url">{Url}</div></li>';
      return '<ul class="search">' + Dive.Common.thrust(tpl, results.WebResult) + '</ul>';
    }
  });

  Dive.Controller.addWidget({
    name: 'Google news',
    color: 'orange',
    scrollable: true,
    limit: 5,
    getQuery: function(widget, text) {
      return 'select unescapedUrl, title, content from google.news(0) where q="' + Dive.Common.escape(text) + '" limit ' + widget.limit + ' offset ' + widget.offset;
    },
    template: function(widget, results) {
      var tpl = '<li><div class="title"><a href="{unescapedUrl}" target="_blank">{title}</a></div><div class="content">{content}</div></li>';
      return '<ul class="news">' + Dive.Common.thrust(tpl, results.results) + '</ul>';
    }
  });

  Dive.Controller.addWidget({
    name: 'Google translate',
    color: 'yellow',
    init: function(widget) {
      widget.$content.before('<form class="translate"><label for="target">Translate into:</label><select name="target" id="target"><option value="ru">Russian</option><option value="en">English</option><option value="es">Spanish</option><option value="separator" disabled="">—</option><option value="af">Afrikaans</option><option value="sq">Albanian</option><option value="ar">Arabic</option><option value="be">Belarusian</option><option value="bg">Bulgarian</option><option value="ca">Catalan</option><option value="zh-CN">Chinese (Simplified)</option><option value="zh-TW">Chinese (Traditional)</option><option value="hr">Croatian</option><option value="cs">Czech</option><option value="da">Danish</option><option value="nl">Dutch</option><option value="en">English</option><option value="et">Estonian</option><option value="tl">Filipino</option><option value="fi">Finnish</option><option value="fr">French</option><option value="gl">Galician</option><option value="de">German</option><option value="el">Greek</option><option value="iw">Hebrew</option><option value="hi">Hindi</option><option value="hu">Hungarian</option><option value="is">Icelandic</option><option value="id">Indonesian</option><option value="ga">Irish</option><option value="it">Italian</option><option value="ja">Japanese</option><option value="ko">Korean</option><option value="lv">Latvian</option><option value="lt">Lithuanian</option><option value="mk">Macedonian</option><option value="ms">Malay</option><option value="mt">Maltese</option><option value="no">Norwegian</option><option value="fa">Persian</option><option value="pl">Polish</option><option value="pt">Portuguese</option><option value="ro">Romanian</option><option value="ru">Russian</option><option value="sr">Serbian</option><option value="sk">Slovak</option><option value="sl">Slovenian</option><option value="es">Spanish</option><option value="sw">Swahili</option><option value="sv">Swedish</option><option value="th">Thai</option><option value="tr">Turkish</option><option value="uk">Ukrainian</option><option value="vi">Vietnamese</option><option value="cy">Welsh</option><option value="yi">Yiddish</option></select></form>');
      widget.$select = widget.$elem.find('select[name=target]');
      widget.$select.change(function() {
        widget.search();
      });
    },
    getQuery: function(widget, text) {
      var lang = widget.$select.find('option:selected').val();
      return 'select * from google.translate where q="' + Dive.Common.strip(text) + '" and target="' + lang + '"';
    },
    template: function(widget, results) {
      return '<p class="translate_result">' + results.translatedText + '</p>';
    }
  });

  Dive.Controller.addWidget({
    name: 'Yahoo! images search',
    color: 'green',
    scrollable: true,
    limit: 5,
    getQuery: function(widget, text) {
      return 'select url, thumbnail_url, thumbnail_width, thumbnail_height, title from search.images(0) where query="' + Dive.Common.escape(text) + '" limit ' + widget.limit + ' offset ' + widget.offset;
    },
    template: function(widget, results) {
      var tpl = '<div class="image"><p class="img"><a href="{url}" target="_blank"><img src="{thumbnail_url}" width="{thumbnail_width}" height="{thumbnail_height}"/></a></p><p class="title">{title}</p></div>';
      return Dive.Common.thrust(tpl, results.result);
    }
  });

  Dive.Controller.addWidget({
    name: 'Yahoo! Maps',
    color: 'aquamarine',
    getQuery: function(widget, text) {
      return 'select * from maps.map where location="' + Dive.Common.strip(text) + '" and image_width=280 and image_height=280 and zoom=12';
    },
    template: function(widget, results) {
      return '<img src="' + results.Result.content + '"/>';
    }
  });

  Dive.Controller.addWidget({
    name: 'Yahoo! Weather',
    color: 'blue',
    getQuery: function(widget, text) {
      return 'select * from weather.forecast where location in (select id from weather.search where query="' + Dive.Common.strip(text) + '" limit 1)';
    },
    template: function(widget, results) {
      return '<p>' + results.channel.item.title + '</p><p>' + results.channel.item.description + '</p>';
    }
  });

  $('.widgets').sortable({handle: '.widget_title', revert: true, tolerance: 'pointer'});

  var hash = location.href.split('#')[1];

  if (hash) {
    hash = decodeURI(hash);
    $(this).find('input[name=q]').val(hash);
    Dive.Controller.search(hash);
  }

  $('form#search input[name=q]').focus();

  $('form#search').submit(function() {
    var text = $(this).find('input[name=q]').val();
    if (text) {
      location.href = '#' + encodeURI(text);
      Dive.Controller.search(text);
    }
    return false;
  });
});