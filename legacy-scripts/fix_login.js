const fs = require('fs');
let content = fs.readFileSync('src/app/login/page.tsx', 'utf8');

const oldEffectPattern = /useEffect\(\(\) => \{\s*const checkHash = \(\) => \{\s*if \(typeof window !== 'undefined' && window\.location\.hash === '#pfp'\) \{\s*setIsPfpModalOpen\(true\);\s*window\.history\.replaceState\(\{\}, '', window\.location\.pathname \+ window\.location\.search\);\s*\}\s*\};\s*checkHash\(\);\s*window\.addEventListener\('hashchange', checkHash\);\s*return \(\) => window\.removeEventListener\('hashchange', checkHash\);\s*\}, \[\]\);/;

const newEffect = `  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('pfp') === 'true') {
      setIsPfpModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);`;

content = content.replace(oldEffectPattern, newEffect);
fs.writeFileSync('src/app/login/page.tsx', content);
