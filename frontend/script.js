const professionals = [
  {
    name: "Srinivas",
    skill: "Electrician",
    phones: ["9390178485", "8142716922"],
    experience: "5 years",
    city: "Narasaraopeta"
  },
  {
    name: "Ramesh",
    skill: "Plumber",
    phones: ["9123456780"],
    experience: "8 years",
    city: "Guntur"
  }
];

const searchInput = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");

searchInput.addEventListener("input", () => {
  const value = searchInput.value.toLowerCase();
  suggestionsBox.innerHTML = "";

  if (value === "") return;

  const filtered = professionals.filter(p =>
    p.skill.toLowerCase().includes(value)
  );

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "suggestion-item";

    // phone numbers string
    const phonesText = p.phones.join(", ");

    div.innerHTML = `
      <strong>${p.skill}</strong> – ${p.name}<br>
      📞 ${phonesText}
    `;

    // just fill input on click (no card change)
    div.onclick = () => {
      searchInput.value = p.skill;
      suggestionsBox.innerHTML = "";
    };

    suggestionsBox.appendChild(div);
  });
});
