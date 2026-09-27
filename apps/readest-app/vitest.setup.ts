// jsdom does not implement the CSS namespace; foliate-js TTS uses CSS.escape
// (mark[name="…"] lookups). Provide the standard polyfill so those paths work.
const globalWithCSS = globalThis as { CSS?: { escape?: (value: string) => string } };
if (!globalWithCSS.CSS) globalWithCSS.CSS = {};
if (typeof globalWithCSS.CSS.escape !== 'function') {
  globalWithCSS.CSS.escape = (value: string): string => {
    const string = String(value);
    const length = string.length;
    const firstCodeUnit = string.charCodeAt(0);
    let result = '';
    let index = -1;
    while (++index < length) {
      const codeUnit = string.charCodeAt(index);
      if (codeUnit === 0x0000) {
        result += '�';
      } else if (
        (codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
        codeUnit === 0x007f ||
        (index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
        (index === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit === 0x002d)
      ) {
        result += '\\' + codeUnit.toString(16) + ' ';
      } else if (index === 0 && length === 1 && codeUnit === 0x002d) {
        result += '\\' + string.charAt(index);
      } else if (
        codeUnit >= 0x0080 ||
        codeUnit === 0x002d ||
        codeUnit === 0x005f ||
        (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
        (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
        (codeUnit >= 0x0061 && codeUnit <= 0x007a)
      ) {
        result += string.charAt(index);
      } else {
        result += '\\' + string.charAt(index);
      }
    }
    return result;
  };
}

// Node ≥26 在全局预置了实验性的 localStorage 访问器，未开启
// --experimental-webstorage 时恒返回 undefined；该不可枚举属性会遮蔽
// vitest jsdom 环境拷贝到全局的同名属性（Node 24 无此访问器，不受影响）。
// 检测到 localStorage 不可用时，用隐藏 jsdom 实例的原生 Storage 顶上——
// 必须是真正的 Storage 实例：StorageEvent 的 storageArea 字段会做 IDL
// 类型校验，普通对象实现过不了。已可用的环境（Node 24 CI）守卫直接跳过。
import { JSDOM } from 'jsdom';

let storageUsable = false;
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('__readest_vitest_probe__', '1');
    localStorage.removeItem('__readest_vitest_probe__');
    storageUsable = true;
  }
} catch {
  storageUsable = false;
}
if (!storageUsable) {
  const storageWindow = new JSDOM('', { url: 'http://localhost/' }).window;
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageWindow.localStorage,
    configurable: true,
    writable: true,
  });
}

// matchMedia mock
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom reports these unimplemented methods to its virtual console even when
// the calling test passes. Tests that need media behavior replace them locally.
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = () => {};
  HTMLMediaElement.prototype.load = () => {};
}
