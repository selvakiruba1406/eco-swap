export function SiteFooter() {
  return (
    <footer className="bg-zinc-900 text-zinc-400 py-16 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <h3 className="text-zinc-100 font-medium mb-3">Verified Tech</h3>
            <p className="text-sm leading-relaxed text-pretty">
              Every listing is reviewed to keep accuracy high and prevent hardware waste.
            </p>
          </div>
          <div>
            <h3 className="text-zinc-100 font-medium mb-3">Direct Commerce</h3>
            <p className="text-sm leading-relaxed text-pretty">
              No middlemen. Connect directly with owners in your city for safer, local handoffs.
            </p>
          </div>
          <div>
            <h3 className="text-zinc-100 font-medium mb-3">Eco Conscious</h3>
            <p className="text-sm leading-relaxed text-pretty">
              Extend the life cycle of electronics and keep rare-earth minerals out of landfills.
            </p>
          </div>
        </div>
        <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between gap-4">
          <span className="text-sm font-medium text-zinc-500">
            © {new Date().getFullYear()} EcoSwap Marketplace
          </span>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-zinc-200">Privacy</a>
            <a href="#" className="hover:text-zinc-200">Terms</a>
            <a href="#" className="hover:text-zinc-200">Safety Guide</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
