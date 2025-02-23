const { Telegraf } = require('telegraf');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { exec } = require('child_process');

const bot = new Telegraf('7328103895:xxxxx'); // Replace with your Telegram Bot Token

// Command to start the bot
bot.start((ctx) => {
  ctx.reply('Welcome to the Music Bot! Type /play followed by a song name.');
});

// Command to play music in the group voice chat
bot.command('play', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  if (!query) {
    return ctx.reply('Please provide a song name.');
  }

  try {
    const videoInfo = await ytdl.getInfo(query);
    const audioUrl = videoInfo.formats.find((format) => format.audioEncoding);

    if (audioUrl) {
      const audioStream = ytdl(audioUrl.url, { filter: 'audioonly' });

      // This function makes the bot send audio into the group voice chat
      ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id)
        .then((member) => {
          if (member.status === 'member' || member.status === 'administrator') {
            // The bot is already in the voice chat
            streamToVoiceChat(ctx, audioStream);
          } else {
            // Add the bot to the voice chat (requires admin permissions)
            ctx.telegram.joinChatVoice(ctx.chat.id);
            streamToVoiceChat(ctx, audioStream);
          }
        });

    } else {
      ctx.reply('Sorry, I couldn’t find an audio for that song.');
    }
  } catch (err) {
    console.log(err);
    ctx.reply('Error fetching the song. Please try again.');
  }
});

// Stream audio to the voice chat
function streamToVoiceChat(ctx, audioStream) {
  const output = fs.createWriteStream('output.ogg'); // Temporary file to store audio
  audioStream.pipe(output);

  // Use FFmpeg to convert audio to a voice chat-compatible format
  ffmpeg('output.ogg')
    .audioCodec('libopus')
    .audioBitrate(64)
    .format('ogg')
    .on('end', () => {
      console.log('Audio streaming finished.');
      fs.unlinkSync('output.ogg'); // Clean up the temporary file
    })
    .pipe(ctx.telegram.sendVoiceChat(ctx.chat.id, fs.createReadStream('output.ogg')));
}

// Start the bot
bot.launch();
