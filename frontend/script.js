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
  },
  {
    name: "Lakshmi Devi",
    skill: "Tailoring",
    phones: ["+91 98765 43226"],
    experience: "15 years",
    city: "Narasaraopet",
    description: "Learn complete tailoring from basics to blouse cutting and dress making. Home-based classes available.",
  },
  {
    name: "Srinivas Rao",
    skill: "Electrician Training",
    phones: ["+91 98765 43227"],
    experience: "20 years",
    city: "Rompicherla",
    description: "Practical electrician training. Learn house wiring, board connection, and repair works.",
  },
  {
    name: "Sunitha Kitchens",
    skill: "Cooking",
    phones: ["+91 98765 43228"],
    experience: "10 years",
    city: "Sattenapalle",
    description: "Learn South Indian traditional cooking, pickles making, and snacks.",
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
