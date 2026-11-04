import a from "./preact-b64/a.js";
import b from "./preact-b64/b.js";
import c from "./preact-b64/c.js";
import d from "./preact-b64/d.js";

var bytes = Uint8Array.from(atob(a + b + c + d), function (ch) { return ch.charCodeAt(0); });
var source = new TextDecoder().decode(bytes);
var url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
var mod = await import(url);
URL.revokeObjectURL(url);

export var h = mod.h;
export var render = mod.render;
export var Component = mod.Component;
