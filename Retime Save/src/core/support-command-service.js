export class SupportCommandService {
  getForm() {
    return document.querySelector('#command-data-form');
  }

  isConfirmationPage() {
    return Boolean(this.getForm()?.querySelector('#troop_confirm_submit'));
  }

  fillFirstForm(config) {
    const form = this.getForm();
    const supportButton = form?.querySelector('#target_support, [name="support"]');
    if (!form || !supportButton) {
      return { error: 'Befehlsformular oder Unterstuetzen-Button wurde nicht gefunden.' };
    }

    for (const [unit, rawAmount] of Object.entries(config.units)) {
      const amount = Number(rawAmount);
      if (amount === 0) continue;

      const input = form.querySelector(`[name="${unit}"]`);
      if (!input) {
        return { error: `Das Eingabefeld fuer "${unit}" ist in diesem Dorf nicht vorhanden.` };
      }
      this.setInputValue(input, amount);
    }

    const xInput = form.querySelector('[name="x"]');
    const yInput = form.querySelector('[name="y"]');
    if (!xInput || !yInput) {
      return { error: 'Die Eingabefelder fuer die Zielkoordinaten wurden nicht gefunden.' };
    }
    this.setInputValue(xInput, config.target.x);
    this.setInputValue(yInput, config.target.y);
    return { form, button: supportButton };
  }

  getConfirmationControls() {
    const form = this.getForm();
    const button = form?.querySelector(
      '#troop_confirm_submit[name="submit_confirm"], #troop_confirm_submit'
    );
    return form && button
      ? { form, button }
      : { error: 'Bestaetigungsformular oder finaler Senden-Button wurde nicht gefunden.' };
  }

  submit(form, button) {
    if (typeof form.requestSubmit === 'function') form.requestSubmit(button);
    else button.click();
  }

  setInputValue(input, value) {
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
