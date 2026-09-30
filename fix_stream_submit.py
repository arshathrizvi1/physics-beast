import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_fetch = '''          try {
            const snapshot = await getDocs(query(collection(db, 'streams'), orderBy('createdAt', 'desc')));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setStreams(data);
            if (data.length > 0 && !stream) {
              setStream(data[0].name);
            }
          } catch (e) {'''

new_fetch = '''          try {
            const snapshot = await getDocs(query(collection(db, 'streams'), orderBy('createdAt', 'desc')));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setStreams(data);
          } catch (e) {'''

content = content.replace(old_fetch, new_fetch)

# Wait, we need to ensure the profileData only includes stream if availableStreams.length > 0
# Actually, the user can change batches back and forth. 
# It's safer to just set stream to "" if they select a batch that doesn't have streams, but doing it on submission is safer.
old_submission = '''            const profileData = { name, dob, school, gender, stream, graduationYear, address, phone, parentPhone, nicNumber };'''
new_submission = '''            const finalStream = availableStreams.length > 0 ? stream : "";
            const profileData = { name, dob, school, gender, stream: finalStream, graduationYear, address, phone, parentPhone, nicNumber };'''

content = content.replace(old_submission, new_submission)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed stream auto-select and sanitized stream on submission!")
