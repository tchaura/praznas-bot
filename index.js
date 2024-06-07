
//основной бот
const token = "7463829875:AAGAb9z3Nf2jLMfVDj7T4fAxPis5O5ws_A4";


const TelegramBot = require('node-telegram-bot-api')
const writeFile = require('fs')


const users = require("./users.json");
const lines = require('./places.json');


const bot = new TelegramBot(token, { polling: true });

bot.on("message", async (msg) => {

  if (msg.web_app_data) {
    // Extract the data sent from the mini app
    const webAppData = JSON.parse(msg.web_app_data.data);

    // Process the data
    console.log('Received data from mini app:', webAppData);

    // Respond to the user or perform other actions as needed
    bot.sendMessage(msg.chat.id, `Received data: ${JSON.stringify(webAppData)}`);
  }

  try {
    const chatId = msg.chat.id;

    await bot.sendPhoto(
      chatId,
      "./example.png",
      {
        caption:
          'Вітаем вас на рэгістрацыі да спектакля!\n',
          reply_markup: {
            keyboard: [
            [
              {
                'text': "Test",
                'web_app': {'url':"http://127.0.0.1:5500/webapp/"}
              }
            ]
          ],
          is_persistent: true
        }
      }
    );

    push({
      id: msg.from.id,
      date: '',
      seat: {
        section: '',
        row: 0,
        seat: 0
      }
    });

    writeFile('./places.json', JSON.stringify(lines, null, 2), (err) => err ? console.log(err): null);
    writeFile('./users.json', JSON.stringify(users, null, 2), (err) => err ? console.log(err) : null);

  } catch (err) {
    console.log(err.message);
  }
});


bot.on("callback_query", async (query) => {
  try {
    await bot.answerCallbackQuery({ callback_query_id: query.id });
    
    if (query.data.includes("select")) {
    
      const dbIndex = findIndex((user) => user.id === query.from.id && user.date === '');
    
      const date = query.data === 'select1' ? '16 снежня 17.00' : '16 снежня 19.30';

      const inDb = findIndex(user => user.date === date && user.id === query.from.id && user.line);

    } else if (query.data.includes('line')){
      
      const dbIndex = findIndex(user => user.id === query.from.id && user.place === 0);

      const line = Number(query.data.split('_')[1]) - 1;
      const kb = lines[line].map((place, i) => {
        if (place[users[dbIndex].date]){
          return [{ text: `Месца ${i + 1}`, callback_data: "place_" + (i + 1) }];
        }
      }).filter(place => place);

      kb.push([{text: "↩️Да выбару рада", callback_data: 'forward'}]);

      await bot.editMessageText(`Калi ласка, абярыце месца ў зале\nВольныя месцы на радзе ${line+1}:`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: kb
        }
      });

      users[dbIndex].line = line+1;
    } else if (query.data.includes('place')){

      const dbIndex = findIndex(user => user.id === query.from.id && user.place === 0);

      const place = Number(query.data.split('_')[1]) - 1;
      const line = users[dbIndex].line - 1;
      const date = users[dbIndex].date;
      lines[line][place][date] = false;

      await bot.editMessageText('Дзякуй за увагу да нашага праекта 😊\n\n'+
      `Ваша дата: ${date}\n\n` +
      `Ваша рад ў зале: ${line+1}\n\n` +
      `Ваша месца ў зале: ${place+1}\n\n` +
      `Адрас: Г.Мiнск, вул. Чайкоўскага 39\n\n` + 
      "Як да нас дабрацца:\nhttps://www.instagram.com/reel/CzR8VtJqdig/?igshid=MTc4MmM1YmI2Ng==", {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: []
        }
      });
      
      await bot.deleteMessage(query.message.chat.id, query.message.message_id - 2);


      // отправка сообщений заказчику
      await bot.sendMessage(581253321, "Забронировано место:\n\n" + 
        "Имя - " + query.from.first_name + ', ссылка на профиль - @' + query.from.username + '\n\n' +
        `Дата - ${date}\n` +
        `Ряд - ${line+1}\n` + 
        `Место - ${place+1}`, {
          reply_markup: {
            inline_keyboard: [
              [{text: "Отменить бронирование", callback_data: `dec_${date}_${line}_${place}_${query.from.id}_${query.from.username}`}]
            ]
          }
        });

      await bot.sendMessage(6178208266, "Забронировано место:\n\n" + 
        "Имя - " + query.from.first_name + ', ссылка на профиль - @' + query.from.username + '\n\n' +
        `Дата - ${date}\n` +
        `Ряд - ${line+1}\n` + 
        `Место - ${place+1}`, {
          reply_markup: {
            inline_keyboard: [
              [{text: "Отменить бронирование", callback_data: `dec_${date}_${line}_${place}_${query.from.id}_${query.from.username}`}]
            ]
          }
        });

      await bot.sendMessage(query.message.chat.id, 'Калі жадаеце забраніраваць яшчэ адно месца, напішыце /start')

      users[dbIndex].place = place + 1;

    } else if (query.data === 'forward'){

      const kb = map((line, i) => {
        if (line.some((place) => place)){
          return [{ text: `Рад ${i + 1}`, callback_data: "line_" + (i + 1) }];
        }
      }).filter(line => line);

      await bot.editMessageText(
        "Калi ласка, абярыце месца ў зале\nВольныя рады:",
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: kb
          }
        }
      );
    } else if (query.data.includes('dec')){
      console.log('123');

      const data = query.data.split('_');
      
      const date = data[1];
      const line = Number(data[2]);
      const place = Number(data[3]);
      const id = Number(data[4]);
      const username = data[5];

      splice(findIndex(user => user.date === date && user.line === line+1 && user.place === place+1 && user.id === id), 1);
      lines[line][place][date] = true;

      await bot.sendMessage(581253321, `Бронирование для ${username} отменено`);
      await bot.sendMessage(6178208266, `Бронирование для ${username} отменено`);
      await bot.sendMessage(id, `Ваша браніраванне на месца ${place+1} рада ${line+1} было адменена`);

    }

    writeFile('./places.json', JSON.stringify(lines, null, 2), (err) => err ? console.log(err): null);
    writeFile('./users.json', JSON.stringify(users, null, 2), (err) => err ? console.log(err) : null);
  } catch (err) {
    console.log(err);
  }
});
