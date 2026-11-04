import { h, render, Component } from "../vendor/preact.module.js";
import htm from "../vendor/htm.module.js";
import p00 from "./parts/c00.js";
import p01 from "./parts/c01.js";
import p02 from "./parts/c02.js";
import p03 from "./parts/c03.js";
import p04 from "./parts/c04.js";
import p05 from "./parts/c05.js";
import p06 from "./parts/c06.js";
import p07 from "./parts/c07.js";
import p08 from "./parts/c08.js";
import p09 from "./parts/c09.js";
import p10 from "./parts/c10.js";
import p11 from "./parts/c11.js";
import p12 from "./parts/c12.js";
import p13 from "./parts/c13.js";
import p14 from "./parts/c14.js";
import p15 from "./parts/c15.js";
import p16 from "./parts/c16.js";
import p17 from "./parts/c17.js";
import p18 from "./parts/c18.js";
import p19 from "./parts/c19.js";
import p20 from "./parts/c20.js";
import p21 from "./parts/c21.js";
import p22 from "./parts/c22.js";
import p23 from "./parts/c23.js";
import p24 from "./parts/c24.js";
import p25 from "./parts/c25.js";
import p26 from "./parts/c26.js";

// The floor source is stored in parts so each file stays small.
// Join them to recover kantor/src/app.js, then run it with these imports.
var bytes = Uint8Array.from(atob([p00,p01,p02,p03,p04,p05,p06,p07,p08,p09,p10,p11,p12,p13,p14,p15,p16,p17,p18,p19,p20,p21,p22,p23,p24,p25,p26].join("")), function (c) { return c.charCodeAt(0); });
var source = new TextDecoder().decode(bytes);
source = source.replace(/^import { h, render, Component } from 'preact';\nimport htm from 'htm';\n/, "");
new Function("h", "render", "Component", "htm", source)(h, render, Component, htm);
