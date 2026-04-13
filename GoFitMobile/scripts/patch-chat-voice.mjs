import fs from 'fs';

const p = new URL('../src/screens/coach-app/ChatScreen.tsx', import.meta.url);
const filePath = fs.realpathSync(p);
let s = fs.readFileSync(filePath, 'utf8');
const marker = 'const stopAndSendRecording = async () => {';
const i = s.indexOf('      if (uri) {', s.indexOf(marker));
const j = s.indexOf('    } catch (err)', i);
if (i === -1 || j === -1) {
  console.error('markers not found');
  process.exit(1);
}
const old = s.slice(i, j);
if (!old.includes('uploadMedia(uri, filename)')) {
  console.error('unexpected block', old.slice(0, 200));
  process.exit(1);
}
const neu = `      if (uri) {
        const filename = \`voice_\${Date.now()}.m4a\`;
        const url = await uploadMedia(uri, filename);
        if (url) {
          const durationLabel = formatDuration(recordingDuration);
          await sendMessage(conversationId, user.id, \`\u{1F3A4} \${durationLabel}\`, 'voice', url);
        } else {
          Alert.alert(t('common.error'), t('chat.uploadFailed'));
        }
      } else {
        Alert.alert(t('common.error'), t('chat.uploadFailed'));
      }
`;
s = s.slice(0, i) + neu + s.slice(j);
fs.writeFileSync(filePath, s, 'utf8');
console.log('patched', filePath);
