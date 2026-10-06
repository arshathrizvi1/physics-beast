import sys
import re

# 1. Update FooterContent.tsx
with open('src/components/FooterContent.tsx', 'r', encoding='utf-8') as f:
    footer = f.read()

footer = footer.replace(
    'contactEmail: "contact@brilliantacademy.com",',
    'contactEmail: "arshathrizvicoding@gmail.com",\n  contactPhone: "+94 77 000 0000",\n  contactAddress: "123 Main Street, Colombo 00100, Sri Lanka",'
)

footer = footer.replace(
    '<p className="text-sm text-muted-foreground">{footer.contactEmail}</p>',
    '<p className="text-sm text-muted-foreground">{footer.contactEmail}</p>\n            {footer.contactPhone && <p className="text-sm text-muted-foreground mt-1">{footer.contactPhone}</p>}\n            {footer.contactAddress && <p className="text-sm text-muted-foreground mt-1">{footer.contactAddress}</p>}'
)

with open('src/components/FooterContent.tsx', 'w', encoding='utf-8') as f:
    f.write(footer)

# 2. Add Contact to terms/page.tsx
with open('src/app/terms/page.tsx', 'r', encoding='utf-8') as f:
    terms = f.read()

if '<h2>Contact Us</h2>' not in terms:
    terms = terms.replace('</div>\n    </div>\n  );\n}', '<h2>Contact Us</h2>\n          <p>\n            If you have any questions about these Terms, please contact us at:<br/>\n            <strong>Brilliant Academy</strong><br/>\n            123 Main Street, Colombo 00100, Sri Lanka<br/>\n            Email: arshathrizvicoding@gmail.com<br/>\n            Phone: +94 77 000 0000\n          </p>\n        </div>\n      </div>\n    </div>\n  );\n}')
    with open('src/app/terms/page.tsx', 'w', encoding='utf-8') as f:
        f.write(terms)

# 3. Add Contact to return-policy/page.tsx
with open('src/app/return-policy/page.tsx', 'r', encoding='utf-8') as f:
    returns = f.read()

if '<h2>Contact Us</h2>' not in returns:
    returns = returns.replace('</div>\n    </div>\n  );\n}', '<h2>Contact Us</h2>\n          <p>\n            If you have any questions about our Return Policy, please contact us at:<br/>\n            <strong>Brilliant Academy</strong><br/>\n            123 Main Street, Colombo 00100, Sri Lanka<br/>\n            Email: arshathrizvicoding@gmail.com<br/>\n            Phone: +94 77 000 0000\n          </p>\n        </div>\n      </div>\n    </div>\n  );\n}')
    with open('src/app/return-policy/page.tsx', 'w', encoding='utf-8') as f:
        f.write(returns)

# 4. Add Contact to privacy-policy/page.tsx
with open('src/app/privacy-policy/page.tsx', 'r', encoding='utf-8') as f:
    privacy = f.read()

if '<h2>Contact Us</h2>' not in privacy:
    privacy = privacy.replace('</div>\n    </div>\n  );\n}', '<h2>Contact Us</h2>\n          <p>\n            If you have any questions about this Privacy Policy, please contact us at:<br/>\n            <strong>Brilliant Academy</strong><br/>\n            123 Main Street, Colombo 00100, Sri Lanka<br/>\n            Email: arshathrizvicoding@gmail.com<br/>\n            Phone: +94 77 000 0000\n          </p>\n        </div>\n      </div>\n    </div>\n  );\n}')
    with open('src/app/privacy-policy/page.tsx', 'w', encoding='utf-8') as f:
        f.write(privacy)

print("Contact sections added successfully.")
