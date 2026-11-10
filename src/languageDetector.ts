import { toPosix } from './pathUtils';

/**
 * Maps file extensions and special file names to Markdown code-fence language
 * tags. Unknown types yield an empty string (a plain code fence).
 */

const EXTENSION_LANGUAGES: Record<string, string> = {
    // Web
    html: 'html',
    htm: 'html',
    xml: 'xml',
    svg: 'svg',
    vue: 'vue',
    svelte: 'svelte',
    astro: 'astro',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    js: 'js',
    mjs: 'js',
    cjs: 'js',
    jsx: 'jsx',
    ts: 'ts',
    mts: 'ts',
    cts: 'ts',
    tsx: 'tsx',
    json: 'json',
    jsonc: 'jsonc',
    json5: 'json5',
    // Data / configuration
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    cfg: 'ini',
    conf: 'ini',
    env: 'dotenv',
    properties: 'properties',
    csv: 'csv',
    tsv: 'tsv',
    // Documentation / text
    md: 'md',
    markdown: 'md',
    mdx: 'mdx',
    rst: 'rst',
    adoc: 'asciidoc',
    txt: 'text',
    log: 'text',
    // Shells / scripts
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    ksh: 'bash',
    ps1: 'powershell',
    psm1: 'powershell',
    psd1: 'powershell',
    bat: 'batch',
    cmd: 'batch',
    // Systems
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    hh: 'cpp',
    hxx: 'cpp',
    cs: 'cs',
    fs: 'fsharp',
    fsx: 'fsharp',
    vb: 'vb',
    go: 'go',
    rs: 'rs',
    zig: 'zig',
    nim: 'nim',
    d: 'd',
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',
    scala: 'scala',
    sc: 'scala',
    groovy: 'groovy',
    gradle: 'groovy',
    // Scripting / other languages
    py: 'py',
    pyw: 'py',
    rb: 'rb',
    php: 'php',
    pl: 'perl',
    pm: 'perl',
    lua: 'lua',
    r: 'r',
    swift: 'swift',
    m: 'objectivec',
    mm: 'objectivec',
    ex: 'elixir',
    exs: 'elixir',
    erl: 'erlang',
    hrl: 'erlang',
    hs: 'haskell',
    clj: 'clojure',
    cljs: 'clojure',
    edn: 'clojure',
    elm: 'elm',
    dart: 'dart',
    sol: 'solidity',
    // Infra
    sql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    tf: 'terraform',
    hcl: 'hcl',
    proto: 'proto',
    cmake: 'cmake',
    mk: 'makefile',
    diff: 'diff',
    patch: 'diff',
    tex: 'latex',
    bib: 'bibtex'
};

const FILENAME_LANGUAGES: Record<string, string> = {
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    gnumakefile: 'makefile',
    'cmakelists.txt': 'cmake',
    '.gitignore': 'gitignore',
    '.gitattributes': 'gitignore',
    '.env': 'dotenv',
    '.editorconfig': 'ini',
    '.npmrc': 'ini',
    '.babelrc': 'json',
    '.eslintrc': 'json',
    '.prettierrc': 'json',
    'go.mod': 'go',
    'go.sum': 'go'
};

export function detectLanguage(relativePath: string): string {
    const posixPath = toPosix(relativePath);
    const baseName = posixPath.slice(posixPath.lastIndexOf('/') + 1).toLowerCase();

    const byFileName = FILENAME_LANGUAGES[baseName];
    if (byFileName !== undefined) {
        return byFileName;
    }

    if (baseName.startsWith('dockerfile')) {
        return 'dockerfile';
    }
    if (baseName.startsWith('makefile')) {
        return 'makefile';
    }

    const dotIndex = baseName.lastIndexOf('.');
    if (dotIndex > 0) {
        const extension = baseName.slice(dotIndex + 1);
        const byExtension = EXTENSION_LANGUAGES[extension];
        if (byExtension !== undefined) {
            return byExtension;
        }
    }

    return '';
}