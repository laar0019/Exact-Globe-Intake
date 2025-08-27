
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("intakeForm");
  const clearBtn = document.getElementById("refreshBtn");
  const printBtn = document.getElementById("printBtn");
  const testMigrationInput = document.getElementById("testMigration");
  const projectTotalInput = document.getElementById("projectTotal");
  const emailInput = document.getElementById("emailAddress");

  // Load cached values
  form.querySelectorAll("input, select, textarea").forEach(el => {
    const name = el.name || el.id;
    if (!name) return;

    const cached = localStorage.getItem(name);
    if (cached !== null) {
      if (el.type === "checkbox") {
        el.checked = cached === "true";
      } else if (el.type === "radio") {
        if (el.value === cached) el.checked = true;
      } else if (el.type === "number") {
        const parsed = parseFloat(cached);
        el.value = !isNaN(parsed) ? parsed : '';
      } else {
        el.value = cached;
      }
    }
  });

  //Trigger change events for relevant selects after restoring values
  ['sqlRelease', 'environmentSetup', 'bpaType'].forEach(id => {
    const select = document.getElementById(id);
    const savedValue = localStorage.getItem(id);
    if (select && savedValue) {
      select.value = savedValue;
      // Trigger native change event
      select.dispatchEvent(new Event('change'));
      // Trigger jQuery change event if jQuery is available
      if (typeof $ !== 'undefined') {
        $('#' + id).trigger('change');
      }
    }
  });

  // Save changes and update totals
  form.addEventListener("input", e => {
    const el = e.target;
    const name = el.name || el.id;
    if (!name) return;
    if (el.type === "checkbox") localStorage.setItem(name, el.checked);
    else if (el.type === "radio" && el.checked) localStorage.setItem(name, el.value);
    else localStorage.setItem(name, el.value);
    updateTotals();
  });

  // Clear form
  if (clearBtn) {
    clearBtn.textContent = "Herstel";
    clearBtn.addEventListener("click", () => {
      if (!confirm("Formuliergegevens wissen?")) return;
      form.querySelectorAll("input, select, textarea").forEach(el => {
        const name = el.name || el.id;
        if (name) localStorage.removeItem(name);
      });
      localStorage.removeItem("migrationScore");
      localStorage.setItem("formJustCleared", "true");
      form.reset();
      form.querySelectorAll("input[type=radio], input[type=checkbox]").forEach(el => el.checked = false);
      if (testMigrationInput) testMigrationInput.value = "";
      if (projectTotalInput) projectTotalInput.value = "";
      const projectManagementAdviceDiv = document.getElementById("projectManagementAdvice");
      if (projectManagementAdviceDiv) projectManagementAdviceDiv.textContent = "Advies: 0";
    });
  }

  // Print button
  if (printBtn) {
    printBtn.addEventListener("click", (e) => {
      let allSelected = true;

      document.querySelectorAll("#products select").forEach(select => {
        const value = select.value;

        if (!value || value === "null") {
          select.classList.add("is-invalid");
          allSelected = false;
        } else {
          select.classList.remove("is-invalid");
        }

        select.addEventListener("change", () => {
          const newValue = select.value;
          if (newValue && newValue !== "null") {
            select.classList.remove("is-invalid");
          }
        }, { once: true });
      });

      if (!allSelected) {
        e.preventDefault();
        alert("Vul alle velden!");
        return;
      }

      window.print();
    });
  }

  // Update totals
  function updateTotals() {
    const sumFieldset = (fieldset, exclude = []) => {
      let sum = 0;
      if (fieldset) fieldset.querySelectorAll("input[type=number]").forEach(input => {
        if (!exclude.includes(input.id)) sum += parseInt(input.value) || 0;
      });
      return sum;
    };

    if (testMigrationInput) {
      const productsFieldset = document.querySelector("fieldset#products");
      testMigrationInput.value = sumFieldset(productsFieldset, ["projectTotal", "projectManagement"]);
      localStorage.setItem("migrationScore", testMigrationInput.value);
    }

    if (projectTotalInput) {
      const servicesFieldset = document.querySelector("fieldset#services");

      const servicesForAdvice = sumFieldset(servicesFieldset, ["projectTotal", "projectManagement"]);
      const projectManagementAdviceDiv = document.getElementById("projectManagementAdvice");
      if (projectManagementAdviceDiv) {
        projectManagementAdviceDiv.textContent = `Advies: ${Math.ceil(servicesForAdvice * 0.2)}`;
      }

      const servicesTotal = sumFieldset(servicesFieldset, ["projectTotal"]);
      projectTotalInput.value = servicesTotal;
    }
  }

  // Attach listeners to fieldsets
  ["products", "services"].forEach(id => {
    const fieldset = document.querySelector(`fieldset#${id}`);
    if (!fieldset) return;

    fieldset.querySelectorAll("input[type=number]").forEach(input => {
      if (id === "services" && input.id === "projectTotal") return;
      input.addEventListener("input", updateTotals);
    });

    if (id === "products") {
      fieldset.querySelectorAll("select").forEach(select => {
        select.addEventListener("change", () => {
          const targetId = select.getAttribute("data-target");
          const scoreAttr = select.options[select.selectedIndex].getAttribute("data-score");
          const score = parseInt(scoreAttr, 10);

          if (targetId) {
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
              targetInput.value = !isNaN(score) ? score : '';
              localStorage.setItem(targetId, !isNaN(score) ? score : '');
            }
          }

          updateTotals();
        });
      });
    }
  });

  // Email validation
  if (emailInput) {
    emailInput.addEventListener("blur", function () {
      const email = emailInput.value.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (email && !emailPattern.test(email)) {
        alert("Please enter a valid email address.");
        setTimeout(() => {
          emailInput.focus();
        }, 0);
      }
    });
  }

  // Nav hide/show on scroll
  (() => {
    let lastScroll = 0;
    const nav = document.querySelector("nav");
    if (!nav) return;

    window.addEventListener("scroll", () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll <= 0) {
        nav.style.top = "0";
        return;
      }
      if (currentScroll > lastScroll) {
        nav.style.top = `-${nav.offsetHeight}px`;
      } else {
        nav.style.top = "0";
      }
      lastScroll = currentScroll;
    });
  })();

  // Initial calculation
  updateTotals();

  $('#bpaType').on('change', function () {
    const selectedValue = $(this).val();
    const bpaWrapper = $('#bpaTaskWrapper');

    if (selectedValue === 'null' || selectedValue === 'NVT') {
      bpaWrapper.fadeOut(200, function () {
        bpaWrapper.addClass('invisible');
      });
    } else {
      bpaWrapper.removeClass('invisible').hide().fadeIn(300);
    }
  });

  $('#environmentType').on('change', function () {
    const selectedValue = $(this).val();
    const workstationWrapper = $('#workstationAmountWrapper');

    if (selectedValue === 'WPL') {
      workstationWrapper.removeClass('invisible').hide().fadeIn(300);
    } else {
      workstationWrapper.fadeOut(200, function () {
        workstationWrapper.addClass('invisible');
      });
    }
  });

  $('#environmentSetup').on('change', function () {
    const selectedValue = $(this).val();
    const alertWrapper = $('#testAlertWrapper');

    if (selectedValue === 'NEE') {
      alertWrapper.removeClass('d-none').hide().fadeIn(500);
    } else {
      alertWrapper.fadeOut(400, function () {
        alertWrapper.addClass('d-none');
      });
    }
  });

  $('#sqlRelease').on('change', function () {
    const selectedValue = $(this).val();
    const alertWrapper = $('#sqlAlertWrapper');

    if (selectedValue !== '2019' && selectedValue !== '2022' && selectedValue !== 'null') {
      alertWrapper.removeClass('d-none').hide().fadeIn(500);
    } else {
      alertWrapper.fadeOut(400, function () {
        alertWrapper.addClass('d-none');
      });
    }
  });

  const alertSelects = [
    { id: "sqlRelease", trigger: true },
    { id: "environmentSetup", trigger: true },
    { id: "bpaType", trigger: true },
    { id: "environmentType", trigger: true }
    // Voeg hier andere select-ID's toe die alerts tonen
  ];

  setTimeout(() => {
    alertSelects.forEach(({ id }) => {
      const savedValue = localStorage.getItem(id);
      if (savedValue) {
        $("#" + id).val(savedValue).trigger("change");
      }
    });
  }, 100);
});
