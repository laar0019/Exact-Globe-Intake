
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("intakeForm");
  const clearBtn = document.getElementById("refreshBtn");
  const printBtn = document.getElementById("printBtn");
  const pdfBtn = document.getElementById("pdfBtn");
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

  // Download PDF for Apple devices
  if (pdfBtn) {
      pdfBtn.addEventListener("click", function () {
          const element = document.getElementById("formContainer");
          console.log("PDF button clicked");

          if (!element) {
              console.error("Form container not found.");
              return;
          }

          // Remove problematic background images from live DOM
          element.querySelectorAll("*").forEach(el => {
              const bg = window.getComputedStyle(el).backgroundImage;
              if (bg && bg !== "none") {
                  //console.log("Background image found:", bg, el);
                  el.style.backgroundImage = "none";
              }
          });

          // Hide <img> tags temporarily
          const hiddenImages = [];
          element.querySelectorAll("img").forEach(img => {
              hiddenImages.push({ el: img, originalDisplay: img.style.display });
              img.style.display = "none";
          });

          const options = {
              margin:       0.5,
              filename:     'Exact Globe+ intake.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  {
                  scale: 2,
                  logging: true,
                  backgroundColor: "#ffffff"
              },
              jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
          };

          html2pdf().set(options).from(element).save().then(() => {
              // Restore images
              hiddenImages.forEach(({ el, originalDisplay }) => {
                  el.style.display = originalDisplay;
              });
          }).catch((err) => {
              console.error("PDF generation failed:", err);
              hiddenImages.forEach(({ el, originalDisplay }) => {
                  el.style.display = originalDisplay;
              });
          });
      });
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
        bpaWrapper.addClass('d-none');
      });
    } else {
      bpaWrapper.removeClass('d-none').hide().fadeIn(300);
    }
  });

  $('#environmentType').on('change', function () {
    const selectedValue = $(this).val();
    const workstationWrapper = $('#workstationAmountWrapper');

    if (selectedValue === 'WPL') {
      workstationWrapper.removeClass('d-none').hide().fadeIn(300);
    } else {
      workstationWrapper.fadeOut(200, function () {
        workstationWrapper.addClass('d-none');
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

    if (selectedValue !== '2019' && selectedValue !== '2022' && selectedValue !== 'null' && selectedValue !== '') {
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

  jQuery(function ($) {
    const $toggle = $('#logoToggle');        // clickable container
    const $csLogo = $('#csLogo');
    const $bsLogo = $('#bsLogo');
    const $csFooter = $('#csFooter');
    const $bsFooter = $('#bsFooter');

    function showBrand(brand) {
      const isCS = brand === 'cs';

      // Toggle logos
      $csLogo.toggleClass('d-none', !isCS);
      $bsLogo.toggleClass('d-none', isCS);

      // Toggle footers (if present)
      if ($csFooter.length) $csFooter.toggleClass('d-none', !isCS);
      if ($bsFooter.length) $bsFooter.toggleClass('d-none', isCS);

      // Helpful state for debugging / a11y
      $toggle.attr({
        'aria-pressed': String(!isCS),     // pressed means BrainSys shown
        'data-brand': isCS ? 'cs' : 'bs'
      });
    }

    // Initial sync based on current DOM state
    const isCSVisible = !$csLogo.hasClass('d-none');
    showBrand(isCSVisible ? 'cs' : 'bs');

    // Toggle on click
    $toggle.on('click', function () {
      const isCSNow = !$csLogo.hasClass('d-none');
      showBrand(isCSNow ? 'bs' : 'cs');
    });

    // Optional: make the div keyboard/click accessible like a button
    $toggle.attr({ role: 'button', tabindex: 0, 'aria-label': 'Wissel merk' });
    $toggle.on('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $toggle.click();
      }
    });
  });

  // Function to auto-resize all textareas based on content
  function autoResizeTextareas() {
    document.querySelectorAll('textarea').forEach(textarea => {
      textarea.style.height = 'auto'; // Reset height
      textarea.style.height = textarea.scrollHeight + 'px'; // Set to content height
    });
  }

  // Attach the resize function to the beforeprint event
  window.addEventListener('beforeprint', autoResizeTextareas);

  // === EXPORTEREN: Opslaan als JSON-bestand ===
document.getElementById('saveBtn').addEventListener('click', function () {
    const form = document.getElementById('intakeForm');
    const data = {};
    form.querySelectorAll('input, select, textarea').forEach(el => {
        const name = el.name || el.id;
        if (!name) return;
        if (el.type === 'checkbox') {
            data[name] = el.checked;
        } else if (el.type === 'radio') {
            if (el.checked) data[name] = el.value;
        } else {
            data[name] = el.value;
        }
    });
    // Download als JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'intake-formulier.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// === IMPORTEREN: Openen en automatisch invullen ===
document.getElementById('loadBtn').addEventListener('click', function () {
    // Maak een verborgen file input aan
    let fileInput = document.getElementById('jsonImportInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'jsonImportInput';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }
    fileInput.click();

    fileInput.onchange = function (event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                const form = document.getElementById('intakeForm');
                form.querySelectorAll('input, select, textarea').forEach(el => {
                    const name = el.name || el.id;
                    if (!name || !(name in data)) return;
                    if (el.type === 'checkbox') {
                        el.checked = data[name] === true || data[name] === 'true';
                    } else if (el.type === 'radio') {
                        el.checked = el.value === data[name];
                    } else {
                        el.value = data[name];
                    }
                    // Sla ook direct op in localStorage
                    if (el.type === 'checkbox') localStorage.setItem(name, el.checked);
                    else if (el.type === 'radio' && el.checked) localStorage.setItem(name, el.value);
                    else localStorage.setItem(name, el.value);
                });
                // Eventueel: trigger change events voor relevante selects
                ['sqlRelease', 'environmentSetup', 'bpaType'].forEach(id => {
                    const select = document.getElementById(id);
                    if (select && (id in data)) {
                        select.value = data[id];
                        select.dispatchEvent(new Event('change'));
                        if (typeof $ !== 'undefined') {
                            $('#' + id).trigger('change');
                        }
                    }
                });
                alert('Formulierdata succesvol geladen!');
            } catch (err) {
                alert('Ongeldig JSON-bestand.');
            }
        };
        reader.readAsText(file);
    };
});

});
