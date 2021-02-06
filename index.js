// Copyright 2020 Daniel Erat. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Vue.use(VueMeta);

// Tab is the model for a site displaying the signe for a word.
class Tab {
  constructor(name, abbrev, tooltip, getUrl, minWidth) {
    this.name = name;
    this.abbrev = abbrev;
    this.tooltip = tooltip;
    this.getUrl = getUrl;
    this.minWidth = minWidth;

    this.word = '';
    this.url = '';
    this.urlCache = {};
    this.loading = false;
    this.alertShown = false;
    this.alertText = '';
  }

  // Asynchronously loads the sign for the supplied word.
  loadWord(word) {
    this.word = word;
    this.alertShown = false;
    this.loading = true;

    (this.urlCache[word] !== undefined
      ? Promise.resolve(this.urlCache[word])
      : this.getUrl(word)
    )
      .then((url) => {
        this.urlCache[word] = url;
        if (word === this.word) this.url = url;
      })
      .catch((err) => {
        this.word = '';
        this.url = 'about:blank';
        this.alertText = err.toString();
        this.alertShown = true;
      })
      .finally(() => (this.loading = false));
  }
}

new Vue({
  data: {
    inputWord: '', // model for search input
    definedWord: '', // currently-displayed word
    tab: 0, // model for v-tabs (index into |tabs|)
    tabs: [
      new Tab(
        'Lifeprint',
        'LP',
        'Bill Vicars',
        (word) =>
          Promise.resolve(
            `https://www.lifeprint.com/asl101/pages-signs/${
              word[0]
            }/${word.replaceAll(' ', '-')}.htm`
          ),
        746
      ),
      new Tab(
        'Handspeak',
        'HS',
        'Jolanta Lapiak',
        (word) =>
          fetch(
            '/cors-proxy?url=' +
              encodeURIComponent(
                'https://www.handspeak.com/word/search/app/app-dictionary.php'
              ),
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/x-www-form-urlencoded; charset=UTF-8',
              },
              // It doesn't look like multi-word searches are supported, so just
              // search for the first word and hope the full thing appears in the
              // results.
              body: `page=1&query=${escape(word.split()[0])}`,
              credentials: 'omit',
              mode: 'cors',
            }
          )
            .then((resp) => {
              if (!resp.ok) throw new Error(resp.status);
              return resp.text();
            })
            .then((text) => {
              const re = new RegExp(
                `<a href="(/word/search/index\\.php\\?id=\\d+)">${word}</a>`
              );
              const matches = text.match(re);
              if (!matches) throw new Error(`“${word}” not found`);
              return `https://www.handspeak.com${matches[1]}`;
            }),
        500
      ),
      new Tab(
        'SignASL',
        'SA',
        '',
        (word) =>
          Promise.resolve(
            `https://www.signasl.org/sign/${word.replaceAll(' ', '-')}`
          ),
        400
      ),
    ],
    contentWidth: 0,
    contentHeight: 0,
  },
  computed: {
    cleanedInputWord: function () {
      return this.inputWord ? this.inputWord.trim().toLowerCase() : '';
    },
  },
  mounted: function () {
    window.addEventListener('popstate', (e) => this.onPopState(e));
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    // This doesn't receive events while the iframe has the focus,
    // unfortunately.
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    if (window.location.hash.length > 1) {
      const word = window.location.hash.slice(1);
      this.defineWord(word, false /* push */);
      this.inputWord = word;
    }
  },
  methods: {
    // Updates iframes in tabs to define |word|.
    defineWord: function (word, push) {
      if (word === '') return;
      const changed = word !== this.definedWord;
      this.definedWord = word;
      this.tabs.forEach((tab) => tab.loadWord(word));
      if (changed && push) window.history.pushState({ word }, '', `#${word}`);
    },
    onSearchInputKeydown: function (e) {
      if (e.keyCode === 13 && this.cleanedInputWord.length) {
        this.defineWord(this.cleanedInputWord, true /* push */);
        this.$refs.searchInput.blur();
        e.preventDefault();
      }
    },
    onSearchButtonClick: function () {
      this.defineWord(this.cleanedInputWord, true /* push */);
      this.$refs.searchInput.blur();
    },
    onTabChange() {
      // Only update if a new word was typed but not submitted.
      if (this.cleanedInputWord !== this.definedWord) {
        this.defineWord(this.cleanedInputWord, true /* push */);
      }
    },
    onPopState: function (ev) {
      const word = ev.state.word || '';
      this.inputWord = word;
      this.defineWord(word, false /* push */);
    },
    onResize: function () {
      this.contentHeight = window.innerHeight - this.$vuetify.application.top;
      this.contentWidth = window.innerWidth;
    },
    onKeyDown: function (ev) {
      if (ev.key === '/') {
        this.$refs.searchInput.focus();
        ev.stopPropagation();
        ev.preventDefault();
      }
    },
    getFrameStyle: function (i) {
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
  metaInfo() {
    return {
      title: 'ASL Lookup' + (this.definedWord ? ` - ${this.definedWord}` : ''),
    };
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
