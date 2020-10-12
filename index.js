// Information about different sites.
const sites = {
  handspeak: {
    getUrl: word =>
      fetch(
        'https://cors-anywhere.herokuapp.com/https://www.handspeak.com/word/search/app/app-dictionary.php',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: `page=1&query=${escape(word)}`,
        },
      )
        .then(resp => {
          if (!resp.ok) throw new Error(resp.status);
          return resp.text();
        })
        .then(text => {
          const re = new RegExp(
            `<a href="(/word/search/index\\.php\\?id=\\d+)">${word}</a>`,
          );
          const matches = text.match(re);
          if (matches.length == 0) throw new Error('No matches found');
          return `https://www.handspeak.com${matches[1]}`;
        }),
    minWidth: 500,
  },
  lifeprint: {
    getUrl: word =>
      Promise.resolve(
        `https://www.lifeprint.com/asl101/pages-signs/${word[0]}/${word}.htm`,
      ),
    minWidth: 746,
  },
  signasl: {
    getUrl: word => Promise.resolve(`https://www.signasl.org/sign/${word}`),
    minWidth: 400,
  },
};

// Values: 'handspeak', 'lifeprint', 'signasl'
// signingsavvy.com uses X-Frame-Options: sameorigin, so it can't be embedded.
var siteId = '';

function $(id) {
  return document.getElementById(id);
}

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

function updateSite(id) {
  if (id == siteId) return;

  siteId = id;
  for (const id of Object.keys(sites)) {
    const el = $(`${id}-tab`);
    if (id == siteId) el.classList.add('selected');
    else el.classList.remove('selected');
  }
  updateFrameSize();
  updateFrameContent();
}

function updateFrameContent() {
  const frame = $('content-iframe');
  frame.src = 'about:blank';

  const word = $('search-input')
    .value.trim()
    .toLowerCase();
  if (word == '') return;

  const msg = $('content-message');
  msg.style.display = 'block';
  msg.innerText = 'Loading...';

  // TODO: Handle error.
  sites[siteId]
    .getUrl(word)
    .then(url => {
      frame.src = url;
      msg.style.display = 'none';
    })
    .catch(err => {
      msg.innerText = `${err.toString()}`;
    });
}

function updateFrameSize() {
  const wrapper = $('content-wrapper');
  const frame = $('content-iframe');
  const siteWidth = sites[siteId].minWidth;

  if (wrapper.offsetWidth >= siteWidth) {
    frame.style.transform = '';
    frame.style.width = `${wrapper.offsetWidth}px`;
    frame.style.height = `${wrapper.offsetHeight}px`;
  } else {
    const ratio = wrapper.offsetWidth / siteWidth;
    frame.style.transform = `scale(${ratio})`;
    frame.style.width = `${siteWidth}px`;
    frame.style.height = `${wrapper.offsetHeight / ratio}px`;
  }
}
