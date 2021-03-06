'use strict';

var domain;

var elements = {
  counter: {
    processed: document.getElementById('processed-number'),
    save: document.getElementById('save-number'),
    total: document.getElementById('total-number')
  },
  group: {
    size: document.getElementById('group-size'),
    dimension: document.getElementById('group-dimension'),
    type: document.getElementById('group-type'),
    regexp: document.getElementById('group-regexp'),
    origin: document.getElementById('group-origin'),
    directory: document.getElementById('custom-directory')
  },
  size: {
    min: document.getElementById('size-min'),
    max: document.getElementById('size-max'),
    ignore: document.getElementById('unknown-size-skip')
  },
  dimension: {
    width: {
      min: document.getElementById('dimension-width-min'),
      max: document.getElementById('dimension-width-max')
    },
    height: {
      min: document.getElementById('dimension-height-min'),
      max: document.getElementById('dimension-height-max')
    },
    ignore: document.getElementById('unknown-dimension-skip')
  },
  type: {
    jpeg: document.getElementById('type-jpeg'),
    bmp: document.getElementById('type-bmp'),
    gif: document.getElementById('type-gif'),
    png: document.getElementById('type-png'),
    all: document.getElementById('type-all'),
    noType: document.getElementById('no-type'),
  },
  regexp: {
    input: document.getElementById('regexp-input')
  }
};

var images = {};
var processed = 0;

function filtered() {
  return Object.values(images)
  // size
  .filter(img => {
    if (elements.group.size.checked) {
      if (img.size) {
        if (Number(elements.size.min.value) && Number(elements.size.min.value) > img.size) {
          return false;
        }
        if (Number(elements.size.max.value) && Number(elements.size.max.value) < img.size) {
          return false;
        }
        return true;
      }
      else {
        return !elements.size.ignore.checked;
      }
    }
    else {
      return true;
    }
  })
  // dimension
  .filter(img => {
    if (elements.group.dimension.checked) {
      if (img.width) {
        if (Number(elements.dimension.width.min.value) && Number(elements.dimension.width.min.value) > img.width) {
          return false;
        }
        if (Number(elements.dimension.width.max.value) && Number(elements.dimension.width.max.value) < img.width) {
          return false;
        }
      }
      if (img.height) {
        if (Number(elements.dimension.height.min.value) && Number(elements.dimension.height.min.value) > img.height) {
          return false;
        }
        if (Number(elements.dimension.height.max.value) && Number(elements.dimension.height.max.value) < img.height) {
          return false;
        }
      }
      if (img.width && img.height) {
        return true;
      }
      else {
        return !elements.dimension.ignore.checked;
      }
    }
    else {
      return true;
    }
  })
  .filter(img => {
    if (elements.type.all.checked || !elements.group.type.checked) {
      return true;
    }
    else {
      if (img.type) {
        if (img.type === 'image/jpeg' && elements.type.jpeg.checked) {
          return true;
        }
        if (img.type === 'image/png' && elements.type.png.checked) {
          return true;
        }
        if (img.type === 'image/bmp' && elements.type.bmp.checked) {
          return true;
        }
        if (img.type === 'image/gif' && elements.type.gif.checked) {
          return true;
        }

        return false;
      }
      else {
        return false;
      }
    }
  })
  // regexp
  .filter(img => {
    if (elements.group.regexp.checked) {
      const r = new RegExp(elements.regexp.input.value);
      return r.test(img.src);
    }
    else {
      return true;
    }
  })
  //origin
  .filter(img => {
    if (elements.group.origin.checked) {
      const hostname = (new URL(img.src)).hostname;
      return domain.endsWith(hostname) || hostname.endsWith(domain);
    }
    else {
      return true;
    }
  });
}

function update() {
  const index = elements.counter.save.textContent = filtered().length;
  document.querySelector('[data-cmd=save]').disabled = index === 0;
}

chrome.runtime.onMessage.addListener(request => {
  if (request.cmd === 'found-images') {
    request.images.forEach(img => {
      if (!images[img.src]) {
        images[img.src] = img;

        chrome.runtime.sendMessage({
          cmd: 'image-data',
          src: img.src
        }, response => {
          processed += 1;
          images[img.src] = Object.assign(images[img.src], response);
          elements.counter.processed.textContent = processed;
          update();
        });
      }
    });
    elements.counter.total.textContent = Object.keys(images).length;
    update();
  }
});
chrome.runtime.sendMessage({
  cmd: 'get-images'
}, result => {
  domain = result.domain;
  if (result.diSupport) {
    elements.group.directory.value = domain;
  }
  else {
    elements.group.directory.disabled = true;
  }
});

// commands
document.addEventListener('click', e => {
  const cmd = e.target.dataset.cmd;
  if (cmd === 'save') {
    const images = filtered();
    const save = () => {
      chrome.runtime.sendMessage({
        cmd: 'save-images',
        custom: elements.group.directory.value.replace(/[\\\\/:*?"<>|]/g, '_'),
        addJPG: elements.type.noType.checked,
        images
      });
    };

    if (images.length > 30) {
      if (window.confirm(`Are you sure you want to download "${images.length}" images?`)) {
        save();
      }
    }
    else {
      save();
    }
  }
  else if (cmd === 'close') {
    chrome.runtime.sendMessage({
      cmd: 'close-me'
    });
  }
});
// update counter
document.addEventListener('change', update);
