#!/usr/bin/env node

const token = "7463829875:AAGAb9z3Nf2jLMfVDj7T4fAxPis5O5ws_A4";
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const cron = require("node-cron");

const users = require("./db/users.json");
const lines = require('./db/places.json');

const admins = [
  { username: "tim_chaura", chat_id: 0 },
  { username: "NastyaGaevska", chat_id: 0 }
]

const bot = new TelegramBot(token, { polling: true });

// Helper function to save data to JSON files
const saveData = () => {
  fs.writeFile('./db/places.json', JSON.stringify(lines, null, 2), (err) => err && console.log(err));
  fs.writeFile('./db/users.json', JSON.stringify(users, null, 2), (err) => err && console.log(err));
};

// Function to handle seat selection
const handleSeatSelection = async (query, user) => {
  const place = Number(query.data.split('_')[1]) - 1;
  const line = user.line - 1;
  const date = user.date;

  lines[line][place][date] = false;

  await bot.editMessageText(
      '<b>Дзякуй за ўвагу да нашага праекта 😊 </b>\n\n' +
      `🗓️ Ваша дата: ${date}\n\n` +
      `🔹 Ваш рад ў зале: ${line + 1}\n\n` +
      `🔹 Ваша месца ў зале: ${place + 1}\n\n` +
      `♦️ Адрас: вул. Першамайская 23`,
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{text: "🗺️ Як даехаць", callback_data: "how_to_get"}],
            [{text: "📅 Забраніраваць яшчэ", callback_data: "start"}],
            [{text: "❌ Адмяніць браніраванне", callback_data: `delete_${user.id}_${date}_${line + 1}_${place + 1}`}]
          ]
        },
        parse_mode: 'HTML'
      }
  );

  await bot.deleteMessage(query.message.chat.id, query.message.message_id - 2);

  user.place = place + 1;

  console.log(`New booking: ${user.id}, date ${date}, line ${user.line} place ${user.place}`);

  for (const admin of admins) {
    if (admin.chat_id == 0) {
      continue;
    }
    await bot.sendMessage(admin.chat_id, "<b>Забронировано место:</b> \n\n" +
        "Имя - " + query.from.first_name + ', ссылка на профиль - @' + query.from.username + '\n\n' +
        `Дата - ${date}\n` +
        `Ряд - ${line + 1}\n` +
        `Место - ${place + 1}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Отменить бронирование", callback_data: `admin_delete_${query.from.id}_${date}_${line}_${place}` }]
        ]
      },
      parse_mode: 'HTML'
    });
  }

  saveData();
};

// Function to handle line selection
const handleLineSelection = async (query, user) => {
  const line = Number(query.data.split('_')[1]) - 1;
  const kb = lines[line].map((place, i) => {
    if (place[user.date]) {
      return [{ text: `Месца ${i + 1}`, callback_data: "place_" + (i + 1) }];
    }
  }).filter(place => place);

  kb.push([{ text: "⏪ Да выбару рада", callback_data: 'forward' }]);

  await bot.editMessageText(
      `Калi ласка, абярыце месца ў зале\nВольныя месцы на радзе ${line + 1}:`, {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: kb,
        },
      }
  );

  user.line = line + 1;
  saveData();
};

// Function to handle date selection
const handleDateSelection = async (query, user) => {
  const date = query.data === 'select1' ? '13.06.2024, 20:00' : '15.06.2024, 16:30';
  user.date = date;

  const kb = lines.map((line, i) => {
    if (line.some(place => place[date])) {
      return [{ text: `Рад ${i + 1}`, callback_data: "line_" + (i + 1) }];
    }
  }).filter(line => line);

  await bot.sendPhoto(query.message.chat.id, "./scheme.png");
  await bot.sendMessage(
      query.message.chat.id,
      "Калi ласка, абярыце месца ў зале\nВольныя рады:", {
        reply_markup: {
          inline_keyboard: kb,
        },
      }
  );

  saveData();
};

const startConversation = async function (msg) {
  const chatId = msg.chat.id;

  if (admins.some(admin => admin.username == msg.chat.username)) {
    admins.filter(admin => admin.username == msg.chat.username)[0].chat_id = chatId;
    console.log(msg.chat.username)
  }

  await bot.sendPhoto(chatId, "./poster.png", {
    caption: `<b>Вітаем вас на рэгістрацыі да спектакля "Дадому"! </b> \n
🎭 Імерсіўнае хрысціянскае прадстаўленне "Дадому" - гэта гісторыя, якая распавядае гледачу пра страчаны дом і доўгі шлях, які прайшло чалавецтва, каб зноў мець магчымасць апынуцца дома. \n

У гэтым спектаклі вы пазнаёміцеся з гісторыямі знакамітых людзей, з якімі Бог заключыў запавет. Людзей, якія паверылі Яго абяцанню. \n
Што здарылася з тымі героямі? Ці страцілі мы свой сапраўдны дом, і ці ёсці у нас магчымасць зноў апынуцца там?
Даведаецеся ў нас на спектаклі!

<i>📌 Уваход - любая купюра. </i>`,
    parse_mode: "HTML"
  });

  await bot.sendMessage(chatId, `Калi ласка, абярыце час спектакля:`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "1️⃣ 13 чэрвеня, 20:00", callback_data: "select1" }],
        [{ text: "2️⃣ 15 чэрвеня, 16:30", callback_data: "select2" }]
      ],
    },
  });

  users.push({
    id: chatId,
    date: '',
    line: 0,
    place: 0,
  });

  saveData();
}

const deleteBooking = async function(chatId, queryData) {
  const [_, userId, date, realLine, realPlace] = queryData.split('_');

  const booking = users.find(user => user.id == userId && user.date == date && user.line == realLine && user.place == realPlace);

  if (booking) {
    await bot.sendMessage(chatId, `Вы ўпэўнены, што жадаеце адмяніць браніраванне на ${realPlace} месца ў ${realLine} радзе на ${date}?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Так", callback_data: `confirm_delete_${userId}_${date}_${realLine}_${realPlace}` }],
          [{ text: "❌ Не", callback_data: "cancel_delete" }]
        ]
      }
    });
  } else {
    await bot.sendMessage(chatId, "Гэта браніраванне ўжо адменена.");
  }
}

// Command to start booking
bot.onText(/\/start/, async (msg) => {
  await startConversation(msg);
});

// Message handler
bot.on("message", async (msg) => {

  if (msg.text === '/delete' || msg.text === '/start') return;  // Skip if the message is the delete or start command

  try {
  } catch (err) {
    console.log(err.message);
  }
});

// Callback query handler
bot.on("callback_query", async (query) => {
  try {
    await bot.answerCallbackQuery({ callback_query_id: query.id });

    const user = users.find(user => user.id == query.from.id && !user.place);

    if (query.data.includes("select")) {
      await handleDateSelection(query, user);
    } else if (query.data.includes('line')) {
      await handleLineSelection(query, user);
    } else if (query.data.includes('place')) {
      await handleSeatSelection(query, user);
    } else if (query.data === 'forward') {
      await handleDateSelection(query, user);
    } else if (query.data.includes('confirm_delete')) {
      const [userId, date, line, place] = query.data.replace('confirm_delete_', '').split('_');
      const userIndex = users.findIndex(user => user.id == userId && user.date == date && user.line == line && user.place == place);
      const user = users[userIndex];

      if (user) {
        lines[line - 1][place - 1][date] = true;
        users.splice(userIndex, 1);
        const remainingBookings = users.filter(curUser => curUser.id == user.id && curUser.date).length;

        await bot.sendMessage(query.message.chat.id, `Ваша браніраванне на месца ${place} рада ${line} на ${date} было адменена.\n
${remainingBookings != 0 ? "❗️ У вас яшчэ засталося " + remainingBookings + " актыўных браніраванняў." : ""}`);
      } else {
        await bot.sendMessage(query.message.chat.id, "Не ўдалося знайсці браніраванне для адмены.");
      }

      console.log(`Booking deleted: ${userId}, date ${date}, line ${line} place ${place}`);
      saveData();
    } else if (query.data.includes('admin_delete')) {
      const queryToParse = query.data.replace('admin_delete', '');
      let [_, userId, date, line, place] = queryToParse.split('_');
      line = Number.parseInt(line) + 1;
      place = Number.parseInt(place) + 1;
      const userIndex = users.findIndex(user => user.id == userId && user.date == date && user.line == line && user.place == place);

      if (userIndex >= 0) {
        users.splice(userIndex, 1);
        lines[line - 1][place - 1][date] = true;

        await bot.sendMessage(query.message.chat.id, `Бронь на месца ${place} рада ${line} на ${date} была адменена адміністратарам.`);
        const remainingBookings = users.filter(user => user.id == userId && user.date).length;

        if (remainingBookings > 0) {
          await bot.sendMessage(userId, `Адміністратар адмяніў вашу бронь на месца ${place} рада ${line} на ${date}. Звярніце ўвагу, што ў вас засталося  ${remainingBookings} актыўных браніроўкі(аў).`);
        } else {
          await bot.sendMessage(userId, `Адміністратар адмяніў вашу бронь на месца ${place} рада ${line} на ${date}.`);
        }

        saveData();
      } else {
        await bot.sendMessage(query.message.chat.id, "Не ўдалося знайсці браніроўку для адмены.");
      }
    } else if (query.data === 'cancel_delete') {
      await bot.sendMessage(query.message.chat.id, "Адменена.");
    } else if (query.data === "how_to_get") {
      await bot.sendMessage(query.message.chat.id, `<b>Як даехаць: </b>\n
♦️<a href="https://yandex.by/maps/-/CDruJ-Mp">Паглядзець ў Яндекс Картах</a>

🚌 Аўтобусы\n
<i>- ад вакзала аўтобусам 115э, праз Як. Коласа, Валгаградскую (Маскоўскую). </i>\n
<i>- з Валгаградскай (м. Маскоўская) аўтобусы 113с, 145с, 115э.</i> \n
🚍 Яшчэ ёсць маршруткі 1151,1455,1554,1409\n
<b>Выходзіць на прыпынку "Раённая бальніца" і ісці наперад 200м. </b>\n`,
          {
            parse_mode: "HTML"
          });
      await bot.sendVideo(query.message.chat.id, "./guide.mp4", {
        caption: "🔹 Як дайсцi ад астаноўкі",
        width: 704,
        height: 1280
      });
    } else if (query.data === 'start') {
      await startConversation(query.message);
    } else if (query.data.includes('delete')) {
      const chatId = query.message.chat.id;
      await deleteBooking(chatId, query.data);
    }
  } catch (err) {
    console.log(err);
  }
});

// Schedule a job to run every day at a specific time (e.g., 8:00 AM) to send reminders
cron.schedule('0 8 * * *', () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formattedTomorrow = `${('0' + tomorrow.getDate()).slice(-2)}.${('0' + (tomorrow.getMonth() + 1)).slice(-2)}.${tomorrow.getFullYear()}`;

  users.forEach(user => {
    if (user.date.startsWith(formattedTomorrow)) {
      bot.sendMessage(user.id, `Нагадваем, што заўтра ў вас браніраванне:\n\n` +
          `Дата: ${user.date}\n` +
          `Рад: ${user.line}\n` +
          `Месца: ${user.place}\n` +
          `Адрас: вул. Першамайская 23\n\n` +
          `Калі ласка, не забудзьцеся з'явіцца!\n` +
          `Вы таксама можаце адмяніць браніраванне камандай /delete`);
    }
  });
});
