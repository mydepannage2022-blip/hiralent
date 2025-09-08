"use client";

const tabs = ["General", "Pricing", "Dashboard", "Login & Sign up", "Find job", "Post job"];

const SearchBar = () => {
    return (
        <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">How can Joblin help you?</h1>
            <p className="text-gray-600 mt-2">We are here to help</p>

            <div className="mt-6 flex justify-center">
                <input
                    type="text"
                    placeholder="Search"
                    className="w-full max-w-lg border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
                {tabs.map((tab, idx) => (
                    <button
                        key={idx}
                        className="rounded-full border px-4 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-blue-100 transition"
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SearchBar;