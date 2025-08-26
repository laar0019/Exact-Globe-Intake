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
        // Only set if it's a valid number
        const parsed = parseFloat(cached);
        el.value = !isNaN(parsed) ? parsed : '';
      } else {
        el.value = cached;
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
      if (!confirm("Are you sure you want to clear all form data?")) return;
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

        // Add listener to reset styling when a valid value is selected
        select.addEventListener("change", () => {
          const newValue = select.value;
          if (newValue && newValue !== "null") {
            select.classList.remove("is-invalid");
          }
        }, { once: true }); // Only attach once per click
      });

      if (!allSelected) {
        e.preventDefault();
        alert("Niet alle productselecties zijn ingevuld. Vul alle velden in voordat je print.");
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

    // Products → testMigration
    if (testMigrationInput) {
      const productsFieldset = document.querySelector("fieldset#products");
      testMigrationInput.value = sumFieldset(productsFieldset, ["projectTotal", "projectManagement"]);
      localStorage.setItem("migrationScore", testMigrationInput.value);
    }

    // Services → projectTotal
    if (projectTotalInput) {
      const servicesFieldset = document.querySelector("fieldset#services");

      // Advies berekenen zonder projectManagement
      const servicesForAdvice = sumFieldset(servicesFieldset, ["projectTotal", "projectManagement"]);
      const projectManagementAdviceDiv = document.getElementById("projectManagementAdvice");
      if (projectManagementAdviceDiv) {
        projectManagementAdviceDiv.textContent = `Advies: ${Math.ceil(servicesForAdvice * 0.2)}`;
      }

      // Eindtotaal inclusief projectManagement
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
        }, 0); // Delay focus to avoid triggering blur again immediately
      }
    });
  }


  // Header hide/show on scroll
  (() => {
    let lastScroll = 0;
    const header = document.querySelector("header");
    if (!header) return;

    window.addEventListener("scroll", () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll <= 0) {
        header.style.top = "0";
        return;
      }
      if (currentScroll > lastScroll) {
        header.style.top = `-${header.offsetHeight}px`;
      } else {
        header.style.top = "0";
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
});
