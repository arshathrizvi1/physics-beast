with open('src/app/about/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('contact@brilliantacademy.com', 'arshathrizvicoding@gmail.com')
code = code.replace('+94 77 123 4567', '+94 77 000 0000')
code = code.replace('location: "Colombo, Sri Lanka",', 'location: "123 Main Street, Colombo 00100, Sri Lanka",')
code = code.replace('www.brilliantacademy.com', 'www.brillliantacademy.site')

with open('src/app/about/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Updated about page defaults')
