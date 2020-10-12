// Copyright 2020 Daniel Erat. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function $(id) {
  return document.getElementById(id);
}

// Information about different sites.
const sites = [
  {
    id: 'lifeprint',
    abbrev: 'LP',
    getUrl: word =>
      Promise.resolve(
        `https://www.lifeprint.com/asl101/pages-signs/${
          word[0]
        }/${word.replaceAll(' ', '-')}.htm`
      ),
    minWidth: 746,
  },
  {
    id: 'handspeak',
    abbrev: 'HS',
    getUrl: word =>
      fetch(
        'https://cors-anywhere.herokuapp.com/https://www.handspeak.com/word/search/app/app-dictionary.php',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          // It doesn't look like multi-word searches are supported, so just
          // search for the first word and hope the full thing appears in the
          // results.
          body: `page=1&query=${escape(word.split()[0])}`,
        }
      )
        .then(resp => {
          if (!resp.ok) throw new Error(resp.status);
          return resp.text();
        })
        .then(text => {
          const re = new RegExp(
            `<a href="(/word/search/index\\.php\\?id=\\d+)">${word}</a>`
          );
          const matches = text.match(re);
          if (!matches) throw new Error('No matches found');
          return `https://www.handspeak.com${matches[1]}`;
        }),
    minWidth: 500,
  },
  {
    id: 'signasl',
    abbrev: 'SA',
    getUrl: word =>
      Promise.resolve(
        `https://www.signasl.org/sign/${word.replaceAll(' ', '-')}`
      ),
    minWidth: 400,
  },
];

new Vue({
  data: {
    inputWord: '', // model for search input
    definedWord: '', // currently-displayed word
    tab: 0, // model for v-tabs (index into |sites|)
    urls: Object.fromEntries(sites.map(s => [s.id, ''])),
    alertShown: Object.fromEntries(sites.map(s => [s.id, false])),
    alertText: Object.fromEntries(sites.map(s => [s.id, ''])),
    contentWidth: 0,
    contentHeight: 0,
    sites,
  },
  computed: {
    cleanedInputWord: function() {
      return this.inputWord ? this.inputWord.trim().toLowerCase() : '';
    },
  },
  mounted: function() {
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  },
  methods: {
    // Updates iframes in tabs to define |word|.
    defineWord: function(word) {
      if (word === '') return;
      this.definedWord = word;
      this.sites.forEach(site => {
        // https://vuejs.org/2016/02/06/common-gotchas/#Why-isn%E2%80%99t-the-DOM-updating
        site
          .getUrl(word)
          .then(url => (this.urls[site.id] = url))
          .catch(err => this.showAlert(site.id, err.toString()));
      });
    },
    onSearchInputKeydown: function(e) {
      if (e.keyCode == 13 && this.cleanedInputWord.length) {
        this.defineWord(this.cleanedInputWord);
      }
    },
    onSearchButtonClick: function() {
      // Force an update in case some tabs failed.
      this.defineWord(this.cleanedInputWord);
    },
    onTabChange() {
      // Only update if a new word was typed but not submitted.
      if (this.cleanedInputWord != this.definedWord) {
        this.defineWord(this.cleanedInputWord);
      }
    },
    onResize: function() {
      this.contentHeight = window.innerHeight - this.$vuetify.application.top;
      this.contentWidth = window.innerWidth;
    },
    getFrameStyle: function(id) {
      const site = this.sites.find(s => s.id == id);
      const ratio = this.contentWidth / site.minWidth;
      return ratio >= 1
        ? {
            width: `${this.contentWidth}px`,
            height: `${this.contentHeight}px`,
          }
        : {
            transform: `scale(${ratio})`,
            width: `${site.minWidth}px`,
            height: `${this.contentHeight / ratio}px`,
          };
    },
    showAlert: function(id, msg) {
      this.alertText[id] = msg;
      this.alertShown[id] = true;
    },
  },
  el: '#app',
  vuetify: new Vuetify({
    theme: {
      themes: {
        light: {
          primary: '#B0BEC5', // blue-gray lighten-3
          accent: '#FFC107', // amber
        },
      },
    },
  }),
});
