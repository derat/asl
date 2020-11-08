// Copyright 2020 Daniel Erat. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

new Vue({
  data: {
    inputWord: '', // model for search input
    definedWord: '', // currently-displayed word
    tab: 0, // model for v-tabs (index into |tabs|)
    tabs: [
      {
        name: 'Lifeprint',
        abbrev: 'LP',
        tooltip: 'Bill Vicars',
        getUrl: word =>
          Promise.resolve(
            `https://www.lifeprint.com/asl101/pages-signs/${
              word[0]
            }/${word.replaceAll(' ', '-')}.htm`
          ),
        minWidth: 746,
        url: '',
        loading: false,
        alertShown: false,
        alertText: '',
      },
      {
        name: 'Handspeak',
        abbrev: 'HS',
        tooltip: 'Jolanta Lapiak',
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
        url: '',
        loading: false,
        alertShown: false,
        alertText: '',
      },
      {
        name: 'SignASL',
        abbrev: 'SA',
        getUrl: word =>
          Promise.resolve(
            `https://www.signasl.org/sign/${word.replaceAll(' ', '-')}`
          ),
        minWidth: 400,
        url: '',
        loading: false,
        alertShown: false,
        alertText: '',
      },
    ],
    contentWidth: 0,
    contentHeight: 0,
  },
  computed: {
    cleanedInputWord: function() {
      return this.inputWord ? this.inputWord.trim().toLowerCase() : '';
    },
  },
  mounted: function() {
    window.addEventListener('popstate', e => this.onPopState(e));
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    if (window.location.hash.length > 1) {
      const word = window.location.hash.slice(1);
      this.defineWord(word);
      this.inputWord = word;
    }
  },
  methods: {
    // Updates iframes in tabs to define |word|.
    defineWord: function(word, push) {
      if (word === '') return;

      const changed = word !== this.definedWord;
      this.definedWord = word;
      this.tabs.forEach(tab => {
        tab.alertShown = false;
        tab.loading = true;
        tab
          .getUrl(word)
          .then(url => (tab.url = url))
          .catch(err => {
            tab.alertText = err.toString();
            tab.alertShown = true;
          })
          .finally(() => (tab.loading = false));
      });
      if (changed && push) window.history.pushState({ word }, '', `#${word}`);
    },
    onSearchInputKeydown: function(e) {
      if (e.keyCode === 13 && this.cleanedInputWord.length) {
        this.defineWord(this.cleanedInputWord, true /* push */);
        this.$refs.searchInput.blur();
      }
    },
    onSearchButtonClick: function() {
      this.defineWord(this.cleanedInputWord, true /* push */);
      this.$refs.searchInput.blur();
    },
    onTabChange() {
      // Only update if a new word was typed but not submitted.
      if (this.cleanedInputWord !== this.definedWord) {
        this.defineWord(this.cleanedInputWord, true /* push */);
      }
    },
    onPopState: function(ev) {
      const word = ev.state.word || '';
      this.inputWord = word;
      this.defineWord(word, false /* push */);
    },
    onResize: function() {
      this.contentHeight = window.innerHeight - this.$vuetify.application.top;
      this.contentWidth = window.innerWidth;
    },
    getFrameStyle: function(i) {
      const tab = this.tabs[i];
      const ratio = this.contentWidth / tab.minWidth;
      return ratio >= 1
        ? {
            width: `${this.contentWidth}px`,
            height: `${this.contentHeight}px`,
          }
        : {
            transform: `scale(${ratio})`,
            width: `${tab.minWidth}px`,
            height: `${this.contentHeight / ratio}px`,
          };
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
