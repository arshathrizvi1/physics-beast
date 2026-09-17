const fs = require('fs');

function addEventListener(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const oldEffect = `const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('pfp') === 'true') {
      setIsPfpModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);`;

  const newEffect = `const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('pfp') === 'true') {
      setIsPfpModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    const handleOpenModal = () => setIsPfpModalOpen(true);
    window.addEventListener('open-pfp-modal', handleOpenModal);
    return () => window.removeEventListener('open-pfp-modal', handleOpenModal);
  }, [searchParams]);`;

  if (content.includes(oldEffect)) {
    content = content.replace(oldEffect, newEffect);
    fs.writeFileSync(filePath, content);
    console.log("Updated", filePath);
  } else {
    console.log("Could not find pattern in", filePath);
  }
}

addEventListener('src/app/login/page.tsx');
addEventListener('src/app/profile/page.tsx');
