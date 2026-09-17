const fs = require('fs');
let content = fs.readFileSync('src/components/FooterContent.tsx', 'utf8');

const oldGrid = `<div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 md:gap-8 mb-6 md:mb-8">
        <div>
          <h3 className="font-bold text-lg text-primary mb-3">Brilliant Academy</h3>
          <p className="text-sm text-muted-foreground">{footer.tagline}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Quick Links</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {footer.quickLinks.map((link, i) => (
              <Link key={i} href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {footer.companyLinks.map((link, i) => (
              <Link key={i} href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Contact</h4>
          <p className="text-sm text-muted-foreground">{footer.contactEmail}</p>
        </div>
      </div>`;

const newGrid = `{/* Mobile Layout (Flex Columns) */}
      <div className="flex md:hidden justify-between gap-4 mb-6">
        <div className="w-1/2 flex flex-col gap-6">
          <div>
            <h3 className="font-bold text-lg text-primary mb-3">Brilliant Academy</h3>
            <p className="text-sm text-muted-foreground">{footer.tagline}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {footer.companyLinks.map((link, i) => (
                <Link key={i} href={link.href} className="hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="w-1/2 flex flex-col gap-6">
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {footer.quickLinks.map((link, i) => (
                <Link key={i} href={link.href} className="hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <p className="text-sm text-muted-foreground">{footer.contactEmail}</p>
          </div>
        </div>
      </div>

      {/* Desktop Layout (Grid) */}
      <div className="hidden md:grid md:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 className="font-bold text-lg text-primary mb-3">Brilliant Academy</h3>
          <p className="text-sm text-muted-foreground">{footer.tagline}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Quick Links</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {footer.quickLinks.map((link, i) => (
              <Link key={i} href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {footer.companyLinks.map((link, i) => (
              <Link key={i} href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Contact</h4>
          <p className="text-sm text-muted-foreground">{footer.contactEmail}</p>
        </div>
      </div>`;

content = content.replace(oldGrid, newGrid);
fs.writeFileSync('src/components/FooterContent.tsx', content);
