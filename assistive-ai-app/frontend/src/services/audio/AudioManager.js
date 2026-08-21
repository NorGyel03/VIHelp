import * as Speech from 'expo-speech';

let queue = [];
let speaking = false;

export const speak = (text, priority = false) => {
  if (priority) queue.unshift(text);
  else queue.push(text);

  processQueue();
};

const processQueue = () => {
  if (speaking || queue.length === 0) return;

  speaking = true;

  const text = queue.shift();

  Speech.speak(text, {
    onDone: () => {
      speaking = false;
      processQueue();
    },
  });
};