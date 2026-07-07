import fs from 'fs';

const pages = [
  'src/pages/EnemyEditorPage.tsx',
  'src/pages/HeroEditorPage.tsx',
  'src/pages/ItemEditorPage.tsx',
  'src/pages/MagicEditorPage.tsx'
];

for (const page of pages) {
  let content = fs.readFileSync(page, 'utf-8');

  // Fix import
  content = content.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate, useLocation } from 'react-router-dom';");

  // Add location and query params
  const navTarget = "const navigate = useNavigate();";
  const navReplacement = `const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentScenarioId = queryParams.get('scenarioId') || 'scenario_test';
  const returnTo = queryParams.get('returnTo');

  const handleExit = () => {
    if (returnTo === 'settings') {
      navigate(\`/?settings=true&resumeScenarioId=\${currentScenarioId}\`);
    } else {
      navigate('/');
    }
  };`;

  if (content.includes(navTarget)) {
    content = content.replace(navTarget, navReplacement);
  }

  // Replace back navigation
  content = content.replace(/navigate\('\/\?settings=true'\)/g, 'handleExit()');
  content = content.replace(/navigate\('\/'\)/g, 'handleExit()'); // If any

  fs.writeFileSync(page, content);
  console.log("Patched", page);
}
