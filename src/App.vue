<script setup lang="ts">
// import { githubLight, githubDark } from '@uiw/codemirror-theme-github'
import { githubLight } from '@fsegurai/codemirror-theme-github-light'
import { githubDark } from '@fsegurai/codemirror-theme-github-dark'
import { Codemirror } from 'vue-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { xml } from '@codemirror/lang-xml'
import { ref, onMounted, computed, watch, type Ref } from 'vue'
import { useMediaQuery, useDebounceFn, useStorage } from '@vueuse/core'
import { prelude } from './prelude'

const code = useStorage(
  'js-code',
  `// Write JS to make your SVG here!
// There's a variable \`svg\` predefined as an SVG element
// that will be rendered to the right.
// Your output SVG code can be seen below.

// This example code creates the official SVG logo:
// https://www.w3.org/2009/08/svg-logos.html

const svgstar = () => {
  const inner = g({ transform: 'translate(150, 150)'});

  for(let i = 0; i < 180; i += 45) {
    const bar = path('M-84.1487,-15.8513 a22.4171,22.4171 0 1 0 0,31.7026 h168.2974 a22.4171,22.4171 0 1 0 0,-31.7026 Z', {
      fill: '#ffb13b',
      transform: \`rotate(\${i})\`
    })
    inner.appendChild(bar)
  }

  return inner;
}

const outer = g({ 'stroke-width': 38.0086, stroke: '#000' });

outer.appendChild(svgstar())

svg.appendChild(outer)

svg.appendChild(svgstar())

svg.setAttribute('viewBox', '0 0 300 300')
`,
)
const svg = ref('')
const prettySVG = ref('')
const right = ref('svg')
const bottom = ref('svg')

const preview: Ref<Element | null> = ref(null)

const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')

const withLang = (lang: () => any) =>
  computed(() => {
    if (isPreferredDark.value) {
      return [lang(), githubDark]
    } else {
      return [lang(), githubLight]
    }
  })

const jsExtensions = withLang(javascript)
const xmlExtensions = withLang(xml)

// adapted from https://github.com/vkiryukhin/vkBeautify/blob/master/vkbeautify.js
var prettifyXml = function (text: string) {
  const createShiftArr = (step: string) => {
    var shift = ['\n'] // array of shifts
    for (ix = 0; ix < 100; ix++) {
      shift.push(shift[ix] + step)
    }
    return shift
  }

  var ar = text
      .replace(/>\s{0,}</g, '><')
      .replace(/</g, '~::~<')
      .replace(/\s*xmlns\:/g, '~::~xmlns:')
      .replace(/\s*xmlns\=/g, '~::~xmlns=')
      .split('~::~'),
    len = ar.length,
    inComment = false,
    deep = 0,
    str = '',
    ix = 0,
    shift = createShiftArr('  ')

  for (ix = 0; ix < len; ix++) {
    // start comment or <![CDATA[...]]> or <!DOCTYPE //
    if (ar[ix].search(/<!/) > -1) {
      str += shift[deep] + ar[ix]
      inComment = true
      // end comment  or <![CDATA[...]]> //
      if (
        ar[ix].search(/-->/) > -1 ||
        ar[ix].search(/\]>/) > -1 ||
        ar[ix].search(/!DOCTYPE/) > -1
      ) {
        inComment = false
      }
    } else if (ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1) {
      // end comment  or <![CDATA[...]]> //
      str += ar[ix]
      inComment = false
    } else if (
      /^<\w/.exec(ar[ix - 1]) &&
      /^<\/\w/.exec(ar[ix]) &&
      // @ts-expect-error
      /^<[\w:\-\.\,]+/.exec(ar[ix - 1]) == /^<\/[\w:\-\.\,]+/.exec(ar[ix])[0].replace('/', '')
    ) {
      // <elm></elm> //
      str += ar[ix]
      if (!inComment) deep--
    } else if (
      ar[ix].search(/<\w/) > -1 &&
      ar[ix].search(/<\//) == -1 &&
      ar[ix].search(/\/>/) == -1
    ) {
      // <elm> //
      str = !inComment ? (str += shift[deep++] + ar[ix]) : (str += ar[ix])
    } else if (ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) > -1) {
      // <elm>...</elm> //
      str = !inComment ? (str += shift[deep] + ar[ix]) : (str += ar[ix])
    } else if (ar[ix].search(/<\//) > -1) {
      // </elm> //
      str = !inComment ? (str += shift[--deep] + ar[ix]) : (str += ar[ix])
    } else if (ar[ix].search(/\/>/) > -1) {
      // <elm/> //
      str = !inComment ? (str += shift[deep] + ar[ix]) : (str += ar[ix])
    } else if (ar[ix].search(/<\?/) > -1) {
      // <? xml ... ?> //
      str += shift[deep] + ar[ix]
    } else if (ar[ix].search(/xmlns\:/) > -1 || ar[ix].search(/xmlns\=/) > -1) {
      // xmlns //
      str += shift[deep] + ar[ix]
    } else {
      str += ar[ix]
    }
  }

  return str[0] == '\n' ? str.slice(1) : str
}

const PRELUDE_NAME = '__prelude__'

const onChange = useDebounceFn(() => {
  const svgNS = 'http://www.w3.org/2000/svg'
  const svgElement = document.createElementNS(svgNS, 'svg')

  try {
    const result = Function(
      'svg',
      PRELUDE_NAME,
      `'use strict';var {${Object.keys(prelude).join(',')}} = ${PRELUDE_NAME};\n${code.value};\nreturn svg`,
    )(svgElement, prelude)

    if (result) {
      prettySVG.value = prettifyXml(result.outerHTML)
      svg.value = result.outerHTML
    } else {
      prettySVG.value = '<!-- `svg` is undefined -->'
    }
  } catch (e) {
    prettySVG.value = '<!-- Error in JS; see console -->'
    console.error(e)
  }
}, 300)

const copy = ref('copy')

const copySVG = () => {
  navigator.clipboard.writeText(prettySVG.value).then(() => {
    copy.value = 'copied!'
    if (window.matchMedia('(any-hover: none)').matches) {
      setTimeout(() => {
        copy.value = 'copy'
      }, 1000)
    }
  })
}

const copyMouseLeave = () => {
  console.log('meow')
  setTimeout(() => {
    copy.value = 'copy'
  }, 300)
}

const downloadSVG = () => {
  const blob = new Blob([prettySVG.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'svgen.svg'
  a.click()
}

const meta = ref('no preview')

watch([svg, preview], () => {
  requestAnimationFrame(() => {
    if (svg.value && preview.value) {
      const svg = preview.value.children?.[0] as (SVGElement & HTMLElement) | undefined
      if (!svg) {
        meta.value = 'no preview'
        return
      }
      // @ts-expect-error
      const width = svg.width.baseVal.value
      // @ts-expect-error
      const height = svg.height.baseVal.value
      meta.value = `${width}×${height}`
    } else {
      meta.value = 'no preview'
    }
  })
})

onMounted(onChange)
</script>

<template>
  <header class="row">
    <h1>SVGen Editor</h1>
    <span class="deemphasized">make SVGs with JS</span>
    <a
      href="https://github.com/auctumnus/svgen"
      aria-label="See this project on GitHub"
      style="color: black"
    >
      <svg
        class="icon"
        xmlns="http://www.w3.org/2000/svg"
        view-box="0 0 24 24"
        width="24"
        height="24"
      >
        <use href="#mdi-github" />
      </svg>
    </a>
  </header>
  <main>
    <div class="code-container region">
      <div class="row">
        <h2>JavaScript</h2>
        <a target="_blank" class="button" href="https://javascript.info/">help</a>
      </div>
      <codemirror v-model="code" autofocus :extensions="jsExtensions" @change="onChange" />
    </div>
    <div class="right region" v-if="right === 'svg'">
      <div class="row">
        <h2>SVG Preview</h2>
        <button @click="right = 'docs'">docs</button>
      </div>
      <div class="svg-preview">
        <div class="svg-preview-inner" v-html="svg" ref="preview" />
        <span class="meta">{{ meta }}</span>
      </div>
    </div>
    <div class="right region" v-if="right === 'docs'">
      <div class="row">
        <h2>SVGen Docs</h2>
        <button @click="right = 'svg'">preview</button>
      </div>
      <p>
        Welcome to SVGen! This is an editor that allows you to easily programmatically create
        <a target="_blank" href="https://en.wikipedia.org/wiki/SVG">SVG files</a> using
        <a target="_blank" href="https://en.wikipedia.org/wiki/JavaScript">JavaScript</a>.
      </p>
      <p>
        In this environment, you have access to a couple different functions to help make creating
        SVGs easier.
      </p>
      <h3 class="docs">
        <code
          >h: (tag: string, props?: Record&lt;string, any&gt;, children?: Element[]): Element</code
        >
      </h3>
      <p>
        Creates an element with the given tag, assigns each property using
        <code>setAttribute</code>, and runs <code>appendChild</code> for each given element. You can
        think of this as a simpler version of the <code>h</code> function found in
        <a target="_blank" href="https://github.com/hyperhype/hyperscript/tree/master"
          >hyperscript</a
        >
        or <a target="_blank" href="https://vuejs.org/guide/extras/render-function">Vue</a>.
      </p>
    </div>
    <div class="svg-code region" v-if="bottom === 'svg'">
      <div class="row">
        <h2>SVG Code</h2>
        <button @click="bottom = 'help'">help</button>
        <button @click="copySVG" @mouseleave="copyMouseLeave">{{ copy }}</button>
        <button @click="downloadSVG">download</button>
      </div>
      <codemirror disabled v-model="prettySVG" :extensions="xmlExtensions" />
    </div>
    <div class="svg-code region" v-else>
      <div class="row">
        <h2>SVG Help</h2>
        <button @click="bottom = 'svg'">code</button>
      </div>
      <ul>
        <li>
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Introduction"
            target="_blank"
            >MDN Introduction to SVG</a
          >
          <p>This is great for getting started understanding the basics.</p>
        </li>
        <li>
          <a href="https://www.nan.fyi/svg-paths" target="_blank">SVG Path Tutorial</a>
          <p>
            This tutorial helped me a lot to understand what's going on in
            <code>&lt;path&gt;</code>.
          </p>
        </li>
        <li>
          <a href="https://www.w3.org/TR/SVG11/" target="_blank">SVG Spec</a>
          <p>Advanced resource for more specific information about SVG.</p>
        </li>
      </ul>
    </div>
  </main>
</template>
