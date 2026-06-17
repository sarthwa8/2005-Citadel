import { BODIES } from '../data/bodies.js'

// Holographic scan-result panel (right side). Builds HTML from BODIES content
// for whichever body was scanned. Planets show their section summary (+ satellite
// list); moons show their specific entry (skills list, job, project, degree).
// Close is handled by ScanSystem (E/Escape/click) via the onClose callback.

let panelEl, designationEl, badgeEl, bodyEl

export function init(onClose) {
  panelEl       = document.getElementById('info-panel')
  designationEl = document.getElementById('panel-designation')
  badgeEl       = document.getElementById('panel-badge')
  bodyEl        = document.getElementById('panel-body')
  document.getElementById('panel-close').addEventListener('click', onClose)
}

// target: Planet or Moon entity instance (resolved via its config).
export function show(target) {
  const cfg = target.config
  let content, badge, designation

  if (cfg.parentKey) {
    // Moon — find its entry under the parent's section content.
    const parent = BODIES[cfg.parentKey]
    content = parent?.moons?.find(m => m.name === cfg.name)
    badge = parent?.heading ?? ''
    designation = content?.label ?? cfg.label ?? cfg.name
  } else {
    content = BODIES[cfg.bodyKey]
    badge = content?.heading ?? ''
    designation = cfg.name
  }

  designationEl.textContent = designation
  badgeEl.textContent = badge.toUpperCase()
  bodyEl.innerHTML = content ? buildBody(content, target) : '<p>NO DATA</p>'
  panelEl.classList.remove('hidden')
}

export function hide() {
  panelEl.classList.add('hidden')
}

// ── HTML builders ────────────────────────────────────────────────────────────

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const line = (k, v) => `<div class="panel-line"><span class="panel-key">${esc(k)}</span> ${esc(v)}</div>`
const linkLine = (k, v, href) =>
  `<div class="panel-line"><span class="panel-key">${esc(k)}</span> <a class="panel-link" href="${esc(href)}" target="_blank" rel="noopener">${esc(v)}</a></div>`
// Prefix bare URLs with https:// so a schemeless value ("www.x.com/..") isn't
// treated as a relative path (which would resolve to localhost/www.x.com/..).
const extUrl = u => /^https?:\/\//i.test(u) ? u : `https://${u}`

function buildBody(content, target) {
  const parts = []

  // GENESIS-style section (About)
  if (content.bio)      parts.push(`<p class="panel-para">${esc(content.bio)}</p>`)
  if (content.location) parts.push(line('LOCATION', content.location))
  if (content.status)   parts.push(line('STATUS', content.status))

  // Moon entry fields
  if (content.role)     parts.push(line('ROLE', content.role))
  if (content.duration) parts.push(line('PERIOD', content.duration))
  if (content.degree)   parts.push(line('DEGREE', content.degree))
  if (content.field)    parts.push(line('FIELD', content.field))
  if (content.period)   parts.push(line('PERIOD', content.period))
  if (content.tech)     parts.push(line('STACK', content.tech))
  if (content.description) parts.push(`<p class="panel-para">${esc(content.description)}</p>`)
  if (content.detail)      parts.push(`<p class="panel-para">${esc(content.detail)}</p>`)
  if (content.items) {
    parts.push(`<ul class="panel-list">${content.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`)
  }
  if (content.link) {
    parts.push(`<div class="panel-line"><a class="panel-link" href="${esc(extUrl(content.link))}" target="_blank" rel="noopener">[ VIEW PROJECT ]</a></div>`)
  }

  // Contact section (NOVARA). Links render as anchors once real URLs replace
  // the placeholders; email gets a mailto. extUrl() guards schemeless URLs.
  if (content.email)    parts.push(linkLine('EMAIL', content.email, `mailto:${content.email}`))
  if (content.linkedin) parts.push(linkLine('LINKEDIN', content.linkedin, extUrl(content.linkedin)))
  if (content.github)   parts.push(linkLine('GITHUB', content.github, extUrl(content.github)))
  if (content.twitter)  parts.push(line('TWITTER', content.twitter))
  if (content.resume) {
    parts.push(`<div class="panel-line"><a class="panel-link" href="${esc(extUrl(content.resume))}" target="_blank" rel="noopener">[ VIEW RESUME ]</a></div>`)
  }

  // Planet with satellites — list what the scan just unlocked.
  // Labels stay raw here — line() escapes its value.
  if (target?.moons?.length) {
    const names = target.moons.map(m => m.config.label ?? m.config.name).join(' · ')
    parts.push(line('SATELLITES', names))
    parts.push('<p class="panel-para panel-hint">SATELLITES UNLOCKED — APPROACH AND SCAN FOR DETAILS</p>')
  }

  return parts.join('')
}
