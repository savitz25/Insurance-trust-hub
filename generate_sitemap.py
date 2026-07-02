with open('sitemap-urls.txt', 'r', encoding='utf-8-sig') as f:
    urls = [line.strip() for line in f if line.strip()]

xml_header = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
'''

xml_footer = '</urlset>'

xml_content = ''
for url in urls:
    xml_content += f'''  <url>
    <loc>{url}</loc>
    <lastmod>2026-07-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
'''

full_xml = xml_header + xml_content + xml_footer

with open('sitemap.xml', 'w', encoding='utf-8') as f:
    f.write(full_xml)

print(f'sitemap.xml created successfully with {len(urls)} URLs')