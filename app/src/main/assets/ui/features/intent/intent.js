/* ===== ПОНИМАНИЕ ЗАПРОСА (для любых моделей) =====
   Короткая постоянная инструкция в системном запросе (через реестр window.SYSX, core/base.js sysExtra):
   • выполнить ВСЕ условия, которые назвал пользователь (ограничения, «своя карта», «в точности как»);
   • большая задача (приложение, игра, документ): сначала одна строка «Понял так: …», потом результат;
   • «улучши, исправь, дополни, продолжи» = работать с файлом из этого чата или с последним результатом, а не начинать заново и не делать другой проект;
   • не выдумывать, что прочитал вложение или увидел картинку; один короткий вопрос только если без ответа никак.
   Если у последнего сообщения есть вложения, добавляется правило цитировать точные названия и строки (так видно, что файл прочитан).
   Убрать модуль: удалить папку и строку в index.html. Тест: docs/tests/intent.test.js */
(window.SYSX=window.SYSX||[]).push(ms=>{
 const u=[...(ms||[])].reverse().find(x=>x.r==='u');
 let s="\n\nUnderstanding requests: read the whole request first and satisfy every requirement and limit the user states (for example a limit on how many items, an own map instead of the original, or \"exactly like X\"). "
  +"For a large task (an app, a game, a document) begin with one short line that starts with \"Understood:\" (in the user's language) saying what you will make, then make it. "
  +"When the user asks to improve, fix, change, continue or extend something, the base is the file attached in this chat or the last thing you produced here: keep its structure, features and style, change only what was asked, and return the complete updated file in one code block, never a fragment and never a different project; do not start from scratch unless asked. "
  +"Never claim to have read an attachment or seen an image that you cannot see; if a file or image is missing, unreadable or unsupported, say so in one sentence. "
  +"Ask at most one short question and only when the task cannot be done sensibly without the answer; otherwise state your assumption in one line and continue. "
  +"When asked to copy or recreate an existing game or app, reproduce its mechanics and structure faithfully, using your own names, art and code.";
 if(u&&u.parts&&u.parts.length)s+=" The latest user message has attachments: work from their real content and quote exact names or lines from them where useful, so the user can see that you read them.";
 return s});
