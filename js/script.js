document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const form = document.getElementById("intakeForm");
    if (!form) return;

    const clearBtn = document.getElementById("refreshBtn");
    const printBtn = document.getElementById("printBtn");
    const pdfBtn = document.getElementById("pdfBtn");
    const saveBtn = document.getElementById("saveBtn");
    const loadBtn = document.getElementById("loadBtn");
    const testMigrationInput = document.getElementById("testMigration");
    const projectTotalInput = document.getElementById("projectTotal");
    const emailInput = document.getElementById("emailAddress");

    const FORM_FIELDS = "input, select, textarea";

    const conditionalFields = [
        "sqlRelease",
        "environmentSetup",
        "environmentType",
        "bpaType",
        "migrationWithCLEAR"
    ];

    // === Helpers ===
    function $(id) {
        return document.getElementById(id);
    }

    function getFieldName(el) {
        return el.name || el.id || "";
    }

    function normalizeValue(value) {
        if (value === true || value === "true") return "Ja";
        if (value === false || value === "false") return "Nee";
        if (value === null || value === undefined) return "";
        return value;
    }

    function setVisible(el, visible) {
        if (!el) return;
        el.classList.toggle("d-none", !visible);
    }

    function getStoredValue(el) {
        if (el.type === "checkbox") return String(el.checked);
        return el.value;
    }

    function saveField(el) {
        const name = getFieldName(el);
        if (!name) return;

        if (el.type === "radio") {
            if (el.checked) localStorage.setItem(name, el.value);
            return;
        }

        localStorage.setItem(name, getStoredValue(el));
    }

    function setFieldValue(el, rawValue) {
        const value = normalizeValue(rawValue);

        if (el.type === "checkbox") {
            el.checked = value === true || value === "true" || value === "Ja";
            return;
        }

        if (el.type === "radio") {
            el.checked = el.value === String(value);
            return;
        }

        if (el.type === "number") {
            const parsed = parseFloat(value);
            el.value = !Number.isNaN(parsed) ? parsed : "";
            return;
        }

        el.value = value;
    }

    function getAllFormFields() {
        return Array.from(form.querySelectorAll(FORM_FIELDS));
    }

    // === Conditional alerts and dynamic sections ===
    // Bewust centraal gemaakt: niet afhankelijk van jQuery .trigger('change').
    // Daardoor werkt dit betrouwbaar bij handmatige invoer, localStorage, JSON-import en GitHub Pages.
    function updateConditionalAlerts() {
        const environmentSetup = $("environmentSetup");
        setVisible($("testAlertWrapper"), environmentSetup?.value === "Nee");

        const migrationWithCLEAR = $("migrationWithCLEAR");
        setVisible($("migrationAlertWrapper"), migrationWithCLEAR?.value === "Nee");

        const sqlRelease = $("sqlRelease");
        const sqlValue = sqlRelease?.value || "";
        const showSqlAlert = Boolean(
            sqlValue &&
            sqlValue !== "null" &&
            sqlValue !== "2019" &&
            sqlValue !== "2022"
        );
        setVisible($("sqlAlertWrapper"), showSqlAlert);

        const bpaType = $("bpaType");
        const bpaValue = bpaType?.value || "";
        setVisible($("bpaTaskWrapper"), Boolean(bpaValue && bpaValue !== "null" && bpaValue !== "NVT"));

        const environmentType = $("environmentType");
        setVisible($("workstationAmountWrapper"), environmentType?.value === "WPL");
    }

    function initConditionalFieldListeners() {
        conditionalFields.forEach(id => {
            const el = $(id);
            if (el) el.addEventListener("change", updateConditionalAlerts);
        });
    }

    // === LocalStorage ===
    function loadCachedValues() {
        getAllFormFields().forEach(el => {
            const name = getFieldName(el);
            if (!name) return;

            const cached = localStorage.getItem(name);
            if (cached === null) return;

            setFieldValue(el, cached);
        });

        updateTotals();
        updateConditionalAlerts();
    }

    function handleFormInput(e) {
        const el = e.target;
        if (!el.matches(FORM_FIELDS)) return;

        saveField(el);
        updateTotals();
        updateConditionalAlerts();
    }

    form.addEventListener("input", handleFormInput);
    form.addEventListener("change", handleFormInput);

    // === Totals ===
    function sumFieldset(fieldset, exclude = []) {
        if (!fieldset) return 0;

        return Array.from(fieldset.querySelectorAll("input[type=number]")).reduce((sum, input) => {
            if (exclude.includes(input.id)) return sum;
            return sum + (parseFloat(input.value) || 0);
        }, 0);
    }

    function updateTotals() {
        const productsFieldset = document.querySelector("fieldset#products");
        const servicesFieldset = document.querySelector("fieldset#services");

        if (testMigrationInput) {
            const migrationScore = sumFieldset(productsFieldset, ["projectTotal", "projectManagement"]);
            testMigrationInput.value = migrationScore;
            localStorage.setItem("migrationScore", String(migrationScore));

            const fieldName = getFieldName(testMigrationInput);
            if (fieldName) localStorage.setItem(fieldName, String(migrationScore));
        }

        if (projectTotalInput) {
            const servicesForAdvice = sumFieldset(servicesFieldset, ["projectTotal", "projectManagement"]);
            const advice = Math.round((servicesForAdvice * 0.1) * 2) / 2;
            const projectManagementAdviceDiv = $("projectManagementAdvice");

            if (projectManagementAdviceDiv) {
                projectManagementAdviceDiv.textContent = `Advies: ${advice.toFixed(1)}`;
            }

            const projectTotal = sumFieldset(servicesFieldset, ["projectTotal"]);
            projectTotalInput.value = projectTotal;

            const fieldName = getFieldName(projectTotalInput);
            if (fieldName) localStorage.setItem(fieldName, String(projectTotal));
        }
    }

    function initScoreSelects() {
        const productsFieldset = document.querySelector("fieldset#products");
        if (!productsFieldset) return;

        productsFieldset.querySelectorAll("select[data-target]").forEach(select => {
            select.addEventListener("change", () => {
                const targetId = select.dataset.target;
                const targetInput = targetId ? $(targetId) : null;
                const selectedOption = select.options[select.selectedIndex];
                const score = parseInt(selectedOption?.dataset.score, 10);

                if (targetInput) {
                    targetInput.value = !Number.isNaN(score) ? score : "";
                    localStorage.setItem(targetId, targetInput.value);
                }

                updateTotals();
            });
        });
    }

    function initTotalInputListeners() {
        ["products", "services"].forEach(id => {
            const fieldset = document.querySelector(`fieldset#${id}`);
            if (!fieldset) return;

            fieldset.querySelectorAll("input[type=number]").forEach(input => {
                if (id === "services" && input.id === "projectTotal") return;
                input.addEventListener("input", updateTotals);
            });
        });
    }

    // === Clear form ===
    function clearForm() {
        if (!confirm("Formuliergegevens wissen?")) return;

        getAllFormFields().forEach(el => {
            const name = getFieldName(el);
            if (name) localStorage.removeItem(name);
        });

        localStorage.removeItem("migrationScore");
        localStorage.setItem("formJustCleared", "true");

        form.reset();
        form.querySelectorAll("input[type=radio], input[type=checkbox]").forEach(el => {
            el.checked = false;
        });

        if (testMigrationInput) testMigrationInput.value = "";
        if (projectTotalInput) projectTotalInput.value = "";

        const projectManagementAdviceDiv = $("projectManagementAdvice");
        if (projectManagementAdviceDiv) projectManagementAdviceDiv.textContent = "Advies: 0";

        updateTotals();
        updateConditionalAlerts();
    }

    if (clearBtn) {
        clearBtn.textContent = "Herstel";
        clearBtn.addEventListener("click", clearForm);
    }

    // === Print ===
    function autoResizeTextareas() {
        document.querySelectorAll("textarea").forEach(textarea => {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        });
    }

    function validateProductsBeforePrint() {
        let allSelected = true;

        document.querySelectorAll("#products select").forEach(select => {
            const isValid = Boolean(select.value && select.value !== "null");
            select.classList.toggle("is-invalid", !isValid);
            if (!isValid) allSelected = false;
        });

        return allSelected;
    }

    window.addEventListener("beforeprint", () => {
        updateConditionalAlerts();
        autoResizeTextareas();
    });

    if (printBtn) {
        printBtn.addEventListener("click", e => {
            updateConditionalAlerts();
            autoResizeTextareas();

            if (!validateProductsBeforePrint()) {
                e.preventDefault();
                alert("Vul alle velden!");
                return;
            }

            window.print();
        });
    }

    // === PDF for Apple devices ===
    if (pdfBtn) {
        pdfBtn.addEventListener("click", () => {
            const element = $("formContainer");
            if (!element) {
                console.error("Form container not found.");
                return;
            }

            updateConditionalAlerts();
            autoResizeTextareas();

            const changedBackgrounds = [];
            element.querySelectorAll("*").forEach(el => {
                const bg = window.getComputedStyle(el).backgroundImage;
                if (bg && bg !== "none") {
                    changedBackgrounds.push({ el, originalBackgroundImage: el.style.backgroundImage });
                    el.style.backgroundImage = "none";
                }
            });

            const hiddenImages = [];
            element.querySelectorAll("img").forEach(img => {
                hiddenImages.push({ el: img, originalDisplay: img.style.display });
                img.style.display = "none";
            });

            const restorePdfChanges = () => {
                changedBackgrounds.forEach(({ el, originalBackgroundImage }) => {
                    el.style.backgroundImage = originalBackgroundImage;
                });

                hiddenImages.forEach(({ el, originalDisplay }) => {
                    el.style.display = originalDisplay;
                });
            };

            if (typeof window.html2pdf === "undefined") {
                console.error("html2pdf is not loaded.");
                restorePdfChanges();
                return;
            }

            const options = {
                margin: 0.5,
                filename: "Exact Globe+ intake.pdf",
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    logging: false,
                    backgroundColor: "#ffffff"
                },
                jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
            };

            window.html2pdf()
                .set(options)
                .from(element)
                .save()
                .then(restorePdfChanges)
                .catch(err => {
                    console.error("PDF generation failed:", err);
                    restorePdfChanges();
                });
        });
    }

    // === Email validation ===
    if (emailInput) {
        emailInput.addEventListener("blur", () => {
            const email = emailInput.value.trim();
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (email && !emailPattern.test(email)) {
                alert("Vul een geldig e-mailadres in.");
                setTimeout(() => emailInput.focus(), 0);
            }
        });
    }

    // === Nav hide/show on scroll ===
    function initNavScroll() {
        const nav = document.querySelector("nav");
        if (!nav) return;

        let lastScroll = 0;

        window.addEventListener("scroll", () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll <= 0) {
                nav.style.top = "0";
                lastScroll = currentScroll;
                return;
            }

            nav.style.top = currentScroll > lastScroll ? `-${nav.offsetHeight}px` : "0";
            lastScroll = currentScroll;
        });
    }

    // === Brand/logo toggle ===
    function initBrandToggle() {
        const toggle = $("logoToggle");
        const csLogo = $("csLogo");
        const bsLogo = $("bsLogo");
        const csFooter = $("csFooter");
        const bsFooter = $("bsFooter");

        if (!toggle || !csLogo || !bsLogo) return;

        function showBrand(brand) {
            const isCS = brand === "cs";

            csLogo.classList.toggle("d-none", !isCS);
            bsLogo.classList.toggle("d-none", isCS);
            csFooter?.classList.toggle("d-none", !isCS);
            bsFooter?.classList.toggle("d-none", isCS);

            toggle.setAttribute("aria-pressed", String(!isCS));
            toggle.setAttribute("data-brand", isCS ? "cs" : "bs");
        }

        showBrand(!csLogo.classList.contains("d-none") ? "cs" : "bs");

        toggle.setAttribute("role", "button");
        toggle.setAttribute("tabindex", "0");
        toggle.setAttribute("aria-label", "Wissel merk");

        toggle.addEventListener("click", () => {
            const isCSNow = !csLogo.classList.contains("d-none");
            showBrand(isCSNow ? "bs" : "cs");
        });

        toggle.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle.click();
            }
        });
    }

    // === Export JSON ===
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const data = {};

            getAllFormFields().forEach(el => {
                const name = getFieldName(el);
                if (!name) return;

                if (el.type === "radio") {
                    if (el.checked) data[name] = el.value;
                    return;
                }

                if (el.type === "checkbox") {
                    data[name] = el.checked;
                    return;
                }

                data[name] = el.value;
            });

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);

            link.href = url;
            link.download = "intake-formulier.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // === Import JSON ===
    if (loadBtn) {
        loadBtn.addEventListener("click", () => {
            let fileInput = $("jsonImportInput");

            if (!fileInput) {
                fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.id = "jsonImportInput";
                fileInput.accept = ".json,application/json";
                fileInput.style.display = "none";
                document.body.appendChild(fileInput);
            }

            // Nodig om hetzelfde bestand twee keer achter elkaar te kunnen importeren.
            fileInput.value = "";
            fileInput.click();

            fileInput.onchange = event => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();

                reader.onload = e => {
                    try {
                        const data = JSON.parse(e.target.result);

                        getAllFormFields().forEach(el => {
                            const name = getFieldName(el);
                            if (!name || !(name in data)) return;

                            setFieldValue(el, data[name]);
                            saveField(el);
                        });

                        updateTotals();
                        updateConditionalAlerts();
                        autoResizeTextareas();

                        alert("Formulierdata succesvol geladen!");
                    } catch (err) {
                        console.error("JSON import failed:", err);
                        alert("Ongeldig JSON-bestand.");
                    }
                };

                reader.readAsText(file);
            };
        });
    }

    // === Flatpickr ===
    if (typeof window.flatpickr !== "undefined") {
        if (window.flatpickr.l10ns?.nl) {
            window.flatpickr.localize(window.flatpickr.l10ns.nl);
        }

        window.flatpickr(".datepicker", {
            dateFormat: "d-m-Y",
            allowInput: true,
            weekNumbers: true,
            disableMobile: true
        });
    }

    // === Init ===
    initConditionalFieldListeners();
    initTotalInputListeners();
    initScoreSelects();
    initNavScroll();
    initBrandToggle();
    loadCachedValues();
    updateTotals();
    updateConditionalAlerts();
});
