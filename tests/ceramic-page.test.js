const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('services/ceramic-coating.html');
test('ceramic page retains indexed route, managed media, real gallery and shared chrome', () => {
  assert.match(html,/rel="canonical" href="https:\/\/www.capitalupfitters.com\/services\/ceramic-coating.html"/);
  assert.match(html,/<meta name="robots" content="index, follow">/);
  for (const id of ['main','hero-heading','benefits-heading','pricing-heading','process-heading','faq-heading','ceramic-video-heading','recent-work-heading']) assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  assert.match(html,/data-media-slot="ceramic-coating"/);
  assert.match(html,/src="\/api\/media\?slot=ceramic-coating&amp;width=1200"/);
  assert.match(html,/<figcaption>Illustrative image<\/figcaption>/);
  assert.match(html,/data-gallery-feed="section" data-service="ceramic-coating"/);
  assert.match(html,/<!-- cu:header -->/);
  assert.match(html,/<!-- cu:footer -->/);
});
test('ceramic protection planner uses native GET and existing request fields without inventing prices', () => {
  assert.match(html,/<form class="partner-fitment-form" action="\.\.\/quote.html" method="get">/);
  assert.match(html,/name="service" value="ceramic"/);
  for (const name of ['product','year','make','model','intended_use']) assert.match(html,new RegExp('name="'+name+'"'));
  assert.equal((html.match(/type="radio" name="product"[^>]*required/g)||[]).length,3);
  assert.doesNotMatch(html,/type="radio" name="product"[^>]*checked/);
  assert.match(html,/not a purchase or a reserved appointment/);
  assert.doesNotMatch(html,/Protection Life Span|permanent hydrophobic|7\+ year|5–9 Year|jNQXAC9IVRw/);
});
test('ceramic visible FAQ answers match structured FAQ exactly', () => {
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/)[1]);
  const faqs = data['@graph'].find(item => item['@type']==='FAQPage').mainEntity;
  faqs.forEach((faq,index) => {
    const answer = html.match(new RegExp('<div class="faq-answer" id="faq-'+(index+1)+'">\\s*<p>([\\s\\S]*?)<\\/p>'))[1];
    assert.equal(answer,faq.acceptedAnswer.text);
    assert.ok(html.includes('<span class="faq-question">'+faq.name+'</span>'));
  });
});
test('ceramic handoff selects real ceramic service and keeps chosen protection in notes', () => {
  for (const product of ['Ceramic coating','PPF + ceramic coating','Help choosing ceramic coating or PPF']) {
    const elements = {'f-year':{value:'',options:[],appendChild(o){this.options.push(o);}},'f-make-sel':{value:'',options:[{value:'Toyota'},{value:'Other'}]},'f-make-other':{value:''},'f-model':{value:''},'f-notes':{value:''}};
    const clicks=[];
    vm.runInNewContext(read('quote-deeplink.js'), {URLSearchParams,setTimeout:fn=>fn(),window:{location:{search:'?service=ceramic&year=2024&make=Toyota&model=4Runner&product='+encodeURIComponent(product)+'&intended_use=Easier+washing+and+upkeep'},CU_QUOTE:{syncMake(){},goStep(){}}},document:{getElementById:id=>elements[id],createElement:()=>({}),querySelectorAll:()=>[{dataset:{svc:'ceramic'},click(){clicks.push('ceramic');}}]}});
    assert.deepEqual(clicks,['ceramic']);
    assert.equal(elements['f-model'].value,'4Runner');
    assert.ok(elements['f-notes'].value.includes('Product requested: '+product));
    assert.ok(elements['f-notes'].value.includes('Intended use: Easier washing and upkeep'));
  }
});
test('ceramic planner reuses campaign handoff and responsive accessible controls', () => {
  assert.match(html,/src="\.\.\/partner-landing.js" defer/);
  const css=read('ceramic-coating.css');
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/min-height:50px/);
  assert.match(css,/\.cc-fields\{grid-template-columns:1fr/);
});
