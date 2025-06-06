const Footer = () => {
  return (
    <footer className="bg-card text-card-foreground py-6 mt-auto border-t">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm">&copy; {new Date().getFullYear()} BookWise. All rights reserved.</p>
        <p className="text-xs mt-1">Discover your next favorite read with us.</p>
      </div>
    </footer>
  );
};

export default Footer;
