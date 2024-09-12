async function fetchStream() {
  return (await fetch(...arguments)).body;
}

async function zfetchStream() {
  try { return await fetchStream(...arguments); } catch (e) { return new Response(e.message).body; }
}
globalThis.decoder = new TextDecoder();
globalThis.decode = function decode() { return decoder.decode(...arguments); }
globalThis.decoder.zdecode = function zdecode(raw) {
  try {
    return globalThis.decoder.decode(raw);
  } catch (e) {
    return e.message;
  }
}
globalThis.zdecoder = function zdecoder() {
  if (!globalThis.decoder) {
    globalThis.decoder = new TextDecoder();
    globalThis.decode = function decode() { return decoder.decode(...arguments); }
    globalThis.decoder.zdecode = function zdecode(raw) {
      try {
        return globalThis.decoder.decode(raw);
      } catch (e) {
        return e.message;
      }
    }
  }
  return globalThis.decoder;
}
globalThis.zdecode = function zdecode() { return decoder.zdecode(...arguments); }

globalThis.zgetReader = function zgetReader(stream) {
  if (!stream) {
    return;
  }
  const r = Object.create(null);
  r.reader = stream.getReader();
  r.almostDone = false;
  return r;
}

globalThis.zread = async function zread(reader) {
  if (reader.almostDone) {
    try {
      reader.reader.releaseLock();
    } catch (e) { }
    return {
      value: undefined,
      done: true
    };
  }
  try {
    const rtrn = await reader.reader.read();
    if (rtrn.done) {
      try {
        reader.reader.releaseLock();
      } catch (e) { }
    }
    return rtrn;
  } catch (e) {
    reader.almostDone = true;
    return {
      value: e.message,
      done: false
    };
  }
};

(globalThis.window ?? {}).DOMInteractive = (fn) => {
  fn ??= () => { };
  if ((globalThis.document?.readyState == 'complete') || (globalThis.document?.readyState == 'interactive')) {
    return fn();
  }
  return new Promise((resolve) => {
    (globalThis.document || globalThis).addEventListener("DOMContentLoaded", () => {
      try { resolve(fn()); } catch (e) { resolve(e); }
    });
  });
}

void async function Main() {
  const stream = await zfetchStream('cheese.txt?' + new Date().getTime());
  const reader = zgetReader(stream);
  let result = await zread(reader);
  await DOMInteractive();
  const textBox = document.querySelector('#text');
  let pumpBuffer = '';
  let doPump = setInterval(function pump() {
    if (pumpBuffer.length > 0) {
      let message = pumpBuffer.trim();
      if (textBox.textContent.trim() != message) {
        textBox.textContent = message;
      }
    }
  }, 100);

  while (!result.done) {
    pumpBuffer += zdecode(result.value);
    result = await zread(reader);
  }

  clearInterval(doPump);

}?.();