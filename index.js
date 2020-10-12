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
        `https://www.lifeprint.com/asl101/pages-signs/${word[0]}/${word}.htm`
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
          body: `page=1&query=${escape(word)}`,
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
          if (matches.length == 0) throw new Error('No matches found');
          return `https://www.handspeak.com${matches[1]}`;
        }),
    minWidth: 500,
  },
  {
    id: 'signasl',
    abbrev: 'SA',
    getUrl: word => Promise.resolve(`https://www.signasl.org/sign/${word}`),
    minWidth: 400,
  },
];

new Vue({
  data: {
    word: '',
    tab: 0,
    urls: new Array(sites.lengths), // 'src' attributes for each tab's iframe
    styles: new Array(sites.lengths), // inline styles for each tab's iframe
    contentWidth: 0,
    contentHeight: 0,
    sites,
  },
  mounted: function() {
    console.log('mounted');
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  },
  methods: {
    onSearchClick: function() {
      console.log(`onSearchClick: ${this.word}`);
      const word = this.word.trim().toLowerCase();
      this.sites.forEach((site, i) => {
        this.urls[i] = 'about:blank';
        if (word === '') return;
        // https://vuejs.org/2016/02/06/common-gotchas/#Why-isn%E2%80%99t-the-DOM-updating
        site.getUrl(word).then(url => this.urls.splice(i, 1, url));
      });
    },
    onResize: function() {
      this.contentHeight = window.innerHeight - this.$vuetify.application.top;
      this.contentWidth = window.innerWidth;
    },
    getFrameStyle: function(i) {
      const site = this.sites[i];
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

/*
document.addEventListener('DOMContentLoaded', () => {
  $('search-input').addEventListener('keydown', e => {
    if (e.keyCode == 13) $('search-button').click();
  });
  $('search-button').addEventListener('click', () => updateFrameContent());

  $('handspeak-tab').addEventListener('click', () => updateSite('handspeak'));
  $('lifeprint-tab').addEventListener('click', () => updateSite('lifeprint'));
  $('signasl-tab').addEventListener('click', () => updateSite('signasl'));

  window.addEventListener('resize', () => updateFrameSize());
  window.setTimeout(() => updateFrameSize(), 100);

  updateSite('lifeprint');
});
*/
