import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

import { Infrastructure, fetchInfrastructures } from '@/utils';

interface InfrastructureSelectorProps {
  onSelectInfrastructure: (infrastructure: Infrastructure) => void;
  onError: (message: string) => void;
  defaultSelectedInfrast?: Infrastructure | null;
  className?: string;
}

const InfrastructureSelector: React.FC<InfrastructureSelectorProps> = ({
  onSelectInfrastructure,
  onError,
  defaultSelectedInfrast = null,
  className
}) => {
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [selectedInfrast, setSelectedInfrast] = useState<Infrastructure | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getInfrastructures();
  }, []);

  // When selected infrastructure changes, notify parent component
  useEffect(() => {
    if (selectedInfrast) {
      onSelectInfrastructure(selectedInfrast);
    }
    else if (defaultSelectedInfrast) {
      setSelectedInfrast(defaultSelectedInfrast);
    }
  }, [selectedInfrast, infrastructures, onSelectInfrastructure, defaultSelectedInfrast]);

  const getInfrastructures = async () => {
    try {
      setIsLoading(true);
      const data = await fetchInfrastructures();
      setInfrastructures(data);
      // if (data.length > 0) {
      //   setSelectedInfraId(data[0].id);
      // }
    } catch (error) {
      console.error('Error fetching infrastructures:', error);
      onError('Failed to fetch infrastructures');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading infrastructures...</div>;
  }

  if (infrastructures.length === 0) {
    return (
      <div className="text-center py-4 text-amber-500">
        No infrastructures available.
      </div>
    );
  }


  return (
    <div className={"mb-6 " + className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="infrastructure-selector"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[calc(100%-5rem)] h-10 cursor-pointer text-gray-200 text-lg bg-slate-950 border-1 border-gray-500"
          >
            {selectedInfrast ? selectedInfrast.name : "Select an infrastructure"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 card1 min-w-80">
          <Command>
            <CommandInput placeholder="Search infrastructure..." className="border-none focus:ring-0 !bg-transparent px-1" />
            <CommandList>
              <CommandEmpty>No infrastructure found.</CommandEmpty>
              <CommandGroup>
                {infrastructures.map(infra => (
                  <CommandItem
                    key={infra.id}
                    value={infra.name}
                    onSelect={() => {
                      setSelectedInfrast(infra);
                      setOpen(false);
                    }}
                    className="cursor-pointer def-hover justify-center border-b-1"
                  >
                    <span>{infra.name}</span>
                    {infra.location && <span className="text-gray-400 ml-2">({infra.location})</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default InfrastructureSelector;