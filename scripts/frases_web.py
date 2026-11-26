#!/usr/bin/env python3
import sys, re, html
# Uso: python3 -I frases.py archivo.html patrón  -> frases visibles (y de datos embebidos) que coinciden, emails y enlaces útiles
raw = open(sys.argv[1], encoding='utf-8', errors='ignore').read()
pat = re.compile(sys.argv[2], re.I)
links = sorted(set(re.findall(r'href="([^"#]+)"', raw)))
t = re.sub(r'(?is)<(script|style)[^>]*>(.*?)</\1>', lambda m: ' ' + m.group(2).replace('\\n', ' ') + ' ' if m.group(1).lower()=='script' else ' ', raw)
t = html.unescape(re.sub(r'(?s)<[^>]+>', '\n', t))
vistos = set()
for frag in re.split(r'\n|(?<=[.!?])\s+|","|\\"', t):
    f = re.sub(r'\s+', ' ', frag).strip()
    if 15 < len(f) < 400 and pat.search(f) and f not in vistos:
        vistos.add(f); print('-', f)
for e in sorted(set(re.findall(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', raw))): print('EMAIL:', e)
for h in links:
    if re.search(r'instagram|food|vendor|restaura|puesto|colabor|trabaja|contact|camp|faq|feirant|expositor|restauração', h, re.I): print('LINK:', h)
