export class BotProtectionService {
  isActive() {
    if (document.querySelector('#captcha, .captcha, img[src*="captcha"], img[src*="botcheck"]')) {
      return true;
    }

    const botProtection = document.querySelector('#botprotection_quest');
    if (botProtection) {
      const style = window.getComputedStyle(botProtection);
      if (style.display !== 'none' && style.visibility !== 'hidden') return true;
    }

    return /du bist ein bot|bot.{0,30}schutz|captcha|are you human/i
      .test(document.body?.innerText || '');
  }
}
