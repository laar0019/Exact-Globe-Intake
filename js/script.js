document.addEventListener("DOMContentLoaded", () => {
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

    const formFieldsSelector = "input, select, textarea";
    const conditionalSelectIds = [
        "sqlRelease",
        "environmentSetup",
        "environmentType",
        "bpaType",
        "migrationWithCLEAR"
    ];

    // === Helpers ===
    function getFieldName(el) {
        return el.name || el.id || "";
    }

    function normalizeValue(value) {
        if (value === true || value === "true") return "Ja";
        if (value === false || value === "false") return "Nee";
        if (value === null || value === undefined) return "";
        return value;
    }

    function toStoredValue(el) {
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

        localStorage.setItem(name, toStoredValue(el));
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

    function triggerChange(el) {
        if (!el) return;
        el.dispatchEvent(new Event("change", { bubbles: true }));

        if (typeof window.jQuery !== "undefined") {
            window.jQuery(el).trigger("change");
        }
    }

    function showWrapper(wrapperId, show, fadeInMs = 500, fadeOutMs = 400) {
        const el = document.getElementById(wrapperId);
        if (!el) return;

        if (typeof window.jQuery !== "undefined") {
            const $el = window.jQuery(el);
            if (show) {
                $el.removeClass("d-none").hide().fadeIn(fadeInMs);
            } else {
                $el.fadeOut(fadeOutMs, function () {
                    $el.addClass("d-none");
                });
            }
            return;
        }

        el.classList.toggle("d-none", !show);
    }

    function triggerConditionalSelects() {
        conditionalSelectIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) triggerChange(select);
        });
    }

    // === Dynamic UI handlers ===
    function initConditionalUiHandlers() {
        const bpaType = document.getElementById("bpaType");
        if (bpaType) {
            bpaType.addEventListener("change", () => {
                const selectedValue = bpaType.value;
                showWrapper("bpaTaskWrapper", selectedValue !== "null" && selectedValue !== "NVT", 300, 200);
            });
        }

        const environmentType = document.getElementById("environmentType");
        if (environmentType) {
            environmentType.addEventListener("change", () => {
                showWrapper("workstationAmountWrapper", environmentType.value === "WPL", 300, 200);
            });
        }

        const environmentSetup = document.getElementById("environmentSetup");
        if (environmentSetup) {
            environmentSetup.addEventListener("change", () => {
                showWrapper("testAlertWrapper", environmentSetup.value === "Nee", 500, 400);
            });
        }

        const sqlRelease = document.getElementById("sqlRelease");
        if (sqlRelease) {
            sqlRelease.addEventListener("change", () => {
                const value = sqlRelease.value;
                const showAlert = value !== "2019" && value !== "2022" && value !== "null" && value !== "";
                showWrapper("sqlAlertWrapper", showAlert, 500, 400);
            });
        }

        const migrationWithCLEAR = document.getElementById("migrationWithCLEAR");
        if (migrationWithCLEAR) {
            migrationWithCLEAR.addEventListener("change", () => {
                showWrapper("migrationAlertWrapper", migrationWithCLEAR.value === "Nee", 500, 400);
            });
        }
    }

    // === Load from localStorage ===
    function loadCachedValues() {
        form.querySelectorAll(formFieldsSelector).forEach(el => {
            const name = getFieldName(el);
            if (!name) return;

            const cached = localStorage.getItem(name);
            if (cached === null) return;

            setFieldValue(el, cached);
        });

        triggerConditionalSelects();
        updateTotals();
    }

    // === Save on changes ===
    function handleFormChange(e) {
        const el = e.target;
        if (!el.matches(formFieldsSelector)) return;

        saveField(el);
        updateTotals();
    }

    form.addEventListener("input", handleFormChange);
    form.addEventListener("change", handleFormChange);

    // === Product/service totals ===
    function sumFieldset(fieldset, exclude = []) {
        let sum = 0;

        if (!fieldset) return sum;

        fieldset.querySelectorAll("input[type=number]").forEach(input => {
            if (!exclude.includes(input.id)) {
                sum += parseFloat(input.value) || 0;
            }
        });

        return sum;
    }

    function updateTotals() {
        const productsFieldset = document.querySelector("fieldset#products");
        const servicesFieldset = document.querySelector("fieldset#services");

        if (testMigrationInput) {
            testMigrationInput.value = sumFieldset(productsFieldset, ["projectTotal", "projectManagement"]);
            localStorage.setItem("migrationScore", testMigrationInput.value);
            localStorage.setItem(getFieldName(testMigrationInput), testMigrationInput.value);
        }

        if (projectTotalInput) {
            const servicesForAdvice = sumFieldset(servicesFieldset, ["projectTotal", "projectManagement"]);
            const projectManagementAdviceDiv = document.getElementById("projectManagementAdvice");

            if (projectManagementAdviceDiv) {
                const advice = Math.round((servicesForAdvice * 0.1) * 2) / 2;
                projectManagementAdviceDiv.textContent = `Advies: ${advice.toFixed(1)}`;
            }

            projectTotalInput.value = sumFieldset(servicesFieldset, ["projectTotal"]);
            localStorage.setItem(getFieldName(projectTotalInput), projectTotalInput.value);
        }
    }

    function initFieldsetListeners() {
        ["products", "services"].forEach(id => {
            const fieldset = document.querySelector(`fieldset#${id}`);
            if (!fieldset) return;

            fieldset.querySelectorAll("input[type=number]").forEach(input => {
                if (id === "services" && input.id === "projectTotal") return;
                input.addEventListener("input", updateTotals);
            });

            if (id !== "products") return;

            fieldset.querySelectorAll("select").forEach(select => {
                select.addEventListener("change", () => {
                    const targetId = select.getAttribute("data-target");
                    const selectedOption = select.options[select.selectedIndex];
                    const score = parseInt(selectedOption?.getAttribute("data-score"), 10);
                    const targetInput = targetId ? document.getElementById(targetId) : null;

                    if (targetInput) {
                        targetInput.value = !Number.isNaN(score) ? score : "";
                        localStorage.setItem(targetId, targetInput.value);
                    }

                    updateTotals();
                });
            });
        });
    }

    // === Clear form ===
    function clearForm() {
        if (!confirm("Formuliergegevens wissen?")) return;

        form.querySelectorAll(formFieldsSelector).forEach(el => {
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

        const projectManagementAdviceDiv = document.getElementById("projectManagementAdvice");
        if (projectManagementAdviceDiv) projectManagementAdviceDiv.textContent = "Advies: 0";

        triggerConditionalSelects();
    }

    if (clearBtn) {
        clearBtn.textContent = "Herstel";
        clearBtn.addEventListener("click", clearForm);
    }

    // === Print ===
    function validateProductsBeforePrint() {
        let allSelected = true;

        document.querySelectorAll("#products select").forEach(select => {
            const isValid = select.value && select.value !== "null";
            select.classList.toggle("is-invalid", !isValid);

            if (!isValid) allSelected = false;
        });

        return allSelected;
    }

    if (printBtn) {
        printBtn.addEventListener("click", e => {
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
            const element = document.getElementById("formContainer");
            if (!element) {
                console.error("Form container not found.");
                return;
            }

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

            const options = {
                margin: 0.5,
                filename: "Exact Globe+ intake.pdf",
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    logging: true,
                    backgroundColor: "#ffffff"
                },
                jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
            };

            html2pdf()
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
        let lastScroll = 0;
        const nav = document.querySelector("nav");
        if (!nav) return;

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
        if (typeof window.jQuery === "undefined") return;

        window.jQuery(function ($) {
            const $toggle = $("#logoToggle");
            const $csLogo = $("#csLogo");
            const $bsLogo = $("#bsLogo");
            const $csFooter = $("#csFooter");
            const $bsFooter = $("#bsFooter");

            if (!$toggle.length) return;

            function showBrand(brand) {
                const isCS = brand === "cs";

                $csLogo.toggleClass("d-none", !isCS);
                $bsLogo.toggleClass("d-none", isCS);

                if ($csFooter.length) $csFooter.toggleClass("d-none", !isCS);
                if ($bsFooter.length) $bsFooter.toggleClass("d-none", isCS);

                $toggle.attr({
                    "aria-pressed": String(!isCS),
                    "data-brand": isCS ? "cs" : "bs"
                });
            }

            showBrand(!$csLogo.hasClass("d-none") ? "cs" : "bs");

            $toggle.attr({ role: "button", tabindex: 0, "aria-label": "Wissel merk" });

            $toggle.on("click", () => {
                const isCSNow = !$csLogo.hasClass("d-none");
                showBrand(isCSNow ? "bs" : "cs");
            });

            $toggle.on("keydown", e => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    $toggle.click();
                }
            });
        });
    }

    // === Textarea resize before printing ===
    function autoResizeTextareas() {
        document.querySelectorAll("textarea").forEach(textarea => {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        });
    }

    window.addEventListener("beforeprint", autoResizeTextareas);

    // === Export JSON ===
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const data = {};

            form.querySelectorAll(formFieldsSelector).forEach(el => {
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

            link.href = URL.createObjectURL(blob);
            link.download = "intake-formulier.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        });
    }

    // === Import JSON ===
    if (loadBtn) {
        loadBtn.addEventListener("click", () => {
            let fileInput = document.getElementById("jsonImportInput");

            if (!fileInput) {
                fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.id = "jsonImportInput";
                fileInput.accept = ".json,application/json";
                fileInput.style.display = "none";
                document.body.appendChild(fileInput);
            }

            fileInput.value = "";
            fileInput.click();

            fileInput.onchange = event => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();

                reader.onload = e => {
                    try {
                        const data = JSON.parse(e.target.result);

                        form.querySelectorAll(formFieldsSelector).forEach(el => {
                            const name = getFieldName(el);
                            if (!name || !(name in data)) return;

                            setFieldValue(el, data[name]);
                            saveField(el);
                        });

                        // Belangrijk: na import alle afhankelijke change-listeners opnieuw uitvoeren.
                        // Hierdoor verschijnen o.a. de SQL-, test-, BPA- en migrationWithCLEAR-alerts direct goed.
                        triggerConditionalSelects();
                        updateTotals();

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

    // === Init order matters ===
    initConditionalUiHandlers();
    initFieldsetListeners();
    initNavScroll();
    initBrandToggle();
    loadCachedValues();
    updateTotals();
});
